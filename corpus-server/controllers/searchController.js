import mongoose from 'mongoose'
import Item from '../models/Item.js'
import { generateEmbedding } from '../services/embedding.js'

function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

/**
 * Escapes regex and splits query string into terms.
 */
export function buildSearchQuery(q) {
  if (!q) return []
  return q.trim().split(/\s+/).filter(Boolean)
}

/**
 * Executes a MongoDB Atlas $vectorSearch query using the 'vector_index' index.
 * Handles userId filtering, post-matching for deleted/archived status, and score projection.
 */
export async function executeVectorSearch({ userId, queryText, limit = 40, type, tag, spaceId }) {
  // Use RETRIEVAL_QUERY task type specifically tuned for search queries
  const queryVector = await generateEmbedding(queryText, 'RETRIEVAL_QUERY')
  if (!queryVector || !Array.isArray(queryVector)) {
    return []
  }

  const userObjectId = new mongoose.Types.ObjectId(userId)
  const matchStage = {
    deletedAt: null,
    archived: false,
  }
  if (type) matchStage.type = type
  if (tag) matchStage.tags = tag
  if (spaceId) {
    try {
      matchStage.spaceId = new mongoose.Types.ObjectId(spaceId)
    } catch {
      matchStage.spaceId = spaceId
    }
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(limit * 5, 50),
        limit: Math.max(limit * 2, 30),
        filter: {
          userId: userObjectId,
        },
      },
    },
    {
      $match: matchStage,
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' },
      },
    },
    {
      $project: {
        embedding: 0,
      },
    },
  ]

  const rawResults = await Item.aggregate(pipeline)
  if (!rawResults || rawResults.length === 0) return []

  const keywords = queryText.toLowerCase().split(/\s+/).filter(Boolean)
  const topVectorScore = rawResults[0]?.score || 0

  // Hybrid relevance calculation: Vector cosine similarity + keyword boost
  const scored = rawResults.map(item => {
    let keywordBonus = 0
    const textBlob = [
      item.title,
      Array.isArray(item.tags) ? item.tags.join(' ') : '',
      item.summary,
      item.note,
      item.content,
      item.contentType,
    ].filter(Boolean).join(' ').toLowerCase()

    for (const kw of keywords) {
      if (textBlob.includes(kw)) {
        keywordBonus += 0.08
      }
    }

    const hasKeyword = keywordBonus > 0
    const vectorScore = item.score || 0
    const finalScore = vectorScore + keywordBonus

    return { item, finalScore, vectorScore, hasKeyword }
  })

  // Filter out noise cards that have zero keyword match and low similarity
  // Discard items that fall too far below the top relevance score to avoid dumping unrelated cards
  const minThreshold = Math.max(0.795, topVectorScore - 0.065)
  const filtered = scored.filter(s => s.hasKeyword || s.finalScore >= minThreshold)

  filtered.sort((a, b) => b.finalScore - a.finalScore)

  return filtered.slice(0, limit).map(s => ({
    ...s.item,
    score: s.finalScore,
  }))
}

/**
 * Unified Search Endpoint supporting both Fast Full-Text & Deep Semantic Vector Search.
 *
 * Query syntax:
 *   GET /api/items/search?q=search+terms&mode=vector (or text)
 */
export async function smartSearch(req, res) {
  const q = (req.query.q || '').trim()
  const mode = req.query.mode || 'text'
  const sort = req.query.sort || 'newest'
  const sortDirection = sort === 'oldest' ? 1 : -1

  const baseQuery = {
    userId: req.user.id,
    deletedAt: null,
    archived: false,
  }

  try {
    // ── EMPTY SEARCH ──
    if (!q) {
      const limit = Math.min(parseInt(req.query.limit) || 20, 50)
      const { cursor, type, tag, spaceId } = req.query
      const query = { ...baseQuery }

      if (type) query.type = type
      if (tag) query.tags = tag
      if (spaceId) query.spaceId = spaceId
      if (cursor) {
        query._id = sortDirection === -1 ? { $lt: cursor } : { $gt: cursor }
      }

      const items = await Item.find(query).sort({ _id: sortDirection }).limit(limit + 1)
      const hasMore = items.length > limit
      const page = hasMore ? items.slice(0, limit) : items

      return res.json({
        items: page,
        nextCursor: hasMore ? page[page.length - 1]._id : null,
      })
    }

    // ── NON-EMPTY SEARCH ──
    const limit = Math.min(parseInt(req.query.limit) || 40, 50)

    // 1. Primary path for Deep Recall / Vector Search
    if (mode === 'vector' || mode === 'deep') {
      try {
        const vectorResults = await executeVectorSearch({
          userId: req.user.id,
          queryText: q,
          limit,
          type: req.query.type,
          tag: req.query.tag,
          spaceId: req.query.spaceId,
        })

        if (vectorResults && vectorResults.length > 0) {
          return res.json({ items: vectorResults, mode: 'vector' })
        }
      } catch (vectorErr) {
        console.warn('[smartSearch] Vector search failed, falling back to text search:', vectorErr.message)
      }
    }

    // 2. Full-Text Search using MongoDB Inverted Text Index
    const searchQuery = {
      ...baseQuery,
      $text: { $search: q },
    }

    if (req.query.type) searchQuery.type = req.query.type
    if (req.query.tag) searchQuery.tags = req.query.tag
    if (req.query.spaceId) searchQuery.spaceId = req.query.spaceId

    let items = []
    try {
      items = await Item.find(
        searchQuery,
        { score: { $meta: 'textScore' } }
      )
        .sort({
          score: { $meta: 'textScore' },
          createdAt: sortDirection,
        })
        .limit(limit)
    } catch (textErr) {
      console.warn('[smartSearch] $text query failed or index rebuilding, falling back to regex:', textErr.message)
    }

    // 3. Fallback path: If $text yielded no results (e.g. short queries or prefix matching)
    if (items.length === 0 && q.length >= 2) {
      const escaped = escapeRegex(q)
      const regex = new RegExp(escaped, 'i')
      const fallbackQuery = {
        ...baseQuery,
        $or: [
          { title: { $regex: regex } },
          { tags: { $regex: regex } },
          { summary: { $regex: regex } },
          { note: { $regex: regex } },
        ],
      }
      if (req.query.type) fallbackQuery.type = req.query.type
      if (req.query.tag) fallbackQuery.tags = req.query.tag
      if (req.query.spaceId) fallbackQuery.spaceId = req.query.spaceId

      items = await Item.find(fallbackQuery)
        .sort({ createdAt: sortDirection })
        .limit(limit)
    }

    return res.json({ items, mode: 'text' })
  } catch (err) {
    console.error('[smartSearch]', err.message)
    return res.status(500).json({ error: 'Search failed', details: err.message })
  }
}

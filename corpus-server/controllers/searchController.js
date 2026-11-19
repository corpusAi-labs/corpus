import mongoose from 'mongoose'
import Item from '../models/Item.js'
import { generateEmbedding } from '../services/embedding.js'
import { blindIndexFor } from '../services/crypto.js'
import { presentItem } from '../services/media.js'
import { searchDocumentsByKeyword, searchDocumentsByVector } from '../services/search/documentSearch.js'
import { vectorQuery } from '../services/search/vectorStore.js'
import { tokenize } from '../services/search/tokenize.js'

// Max items scanned for in-app keyword search (content is encrypted at rest,
// so MongoDB can't run $text / $regex over it).
const KEYWORD_SCAN_LIMIT = 3000

// Same relative weights the old MongoDB text index used
const KEYWORD_FIELD_WEIGHTS = {
  title: 10, tags: 8, summary: 6, content: 4, contentType: 4, note: 3, url: 2,
}

/**
 * Keyword search over decrypted items. Scores every term against each field
 * (whole-word hits count double) and returns the best matches.
 */
export async function executeKeywordSearch({ baseQuery, q, limit, sortDirection, withScores = false }) {
  const terms = buildSearchQuery(q.toLowerCase())
  if (terms.length === 0) return []

  const candidates = await Item.find(baseQuery)
    .sort({ _id: -1 })
    .limit(KEYWORD_SCAN_LIMIT)

  const scored = []
  for (const item of candidates) {
    let score = 0
    for (const [field, weight] of Object.entries(KEYWORD_FIELD_WEIGHTS)) {
      const raw = item[field]
      const text = (Array.isArray(raw) ? raw.join(' ') : raw || '').toLowerCase()
      if (!text) continue
      for (const term of terms) {
        if (!text.includes(term)) continue
        score += weight * (hasWholeWord(text, term) ? 2 : 1)
      }
    }
    if (score > 0) scored.push({ item, score })
  }

  scored.sort((a, b) =>
    b.score - a.score || sortDirection * (a.item.createdAt - b.item.createdAt)
  )
  return withScores ? scored : scored.slice(0, limit).map(s => s.item)
}

const WORD_CHAR = /[\p{L}\p{N}]/u

function hasWholeWord(text, term) {
  for (let i = text.indexOf(term); i !== -1; i = text.indexOf(term, i + 1)) {
    const before = text[i - 1]
    const after = text[i + term.length]
    if ((!before || !WORD_CHAR.test(before)) && (!after || !WORD_CHAR.test(after))) return true
  }
  return false
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
export async function executeVectorSearch({ userId, queryText, limit = 40, type, tag, spaceId, queryVector }) {
  // Use RETRIEVAL_QUERY task type specifically tuned for search queries
  queryVector ??= await generateEmbedding(queryText, 'RETRIEVAL_QUERY')
  if (!queryVector || !Array.isArray(queryVector)) {
    return []
  }

  const matchStage = {
    deletedAt: null,
    archived: false,
  }
  if (type) matchStage.type = type
  if (tag) matchStage.tagIndex = await blindIndexFor(userId, tag, 'Item.tags')
  if (spaceId && mongoose.isValidObjectId(spaceId)) matchStage.spaceId = new mongoose.Types.ObjectId(spaceId)

  const rawResults = await vectorQuery(Item, {
    indexName: 'vector_index',
    userId,
    queryVector,
    k: Math.max(limit * 2, 30),
    filter: matchStage,
    project: { embedding: 0, tagIndex: 0, urlHash: 0 },
  })
  if (!rawResults || rawResults.length === 0) return []

  // Meaningful query words only (no stopwords like "at", "if", "my")
  const keywords = tokenize(queryText).filter(w => w.length >= 3)
  const topVectorScore = rawResults[0]?.score || 0

  // Hybrid relevance: semantic similarity + a small bonus per whole-word keyword hit
  const scored = rawResults.map(item => {
    const textBlob = [
      item.title,
      Array.isArray(item.tags) ? item.tags.join(' ') : '',
      item.summary,
      item.note,
      item.content,
      item.contentType,
    ].filter(Boolean).join(' ').toLowerCase()

    const matched = keywords.filter(kw => hasWholeWord(textBlob, kw)).length
    const keywordBonus = Math.min(0.15, matched * 0.05)
    // A keyword hit only rescues a weak semantic score when it covers most of the query
    const hasKeyword = keywords.length > 0 && matched / keywords.length >= 0.5
    const vectorScore = item.score || 0
    const finalScore = vectorScore + keywordBonus

    return { item, finalScore, vectorScore, hasKeyword }
  })

  // Filter out noise cards that have zero keyword match and low similarity
  // Discard items that fall too far below the top relevance score to avoid dumping unrelated cards
  const minThreshold = Math.max(0.795, topVectorScore - 0.065)
  // Inclusion is decided on meaning (vector score); keyword bonuses only affect the order
  const filtered = scored.filter(s => s.hasKeyword || s.vectorScore >= minThreshold)

  filtered.sort((a, b) => b.finalScore - a.finalScore)

  return filtered.slice(0, limit).map(s => ({
    ...s.item,
    score: s.finalScore,
  }))
}

/** Item-level filters shared by every search path. */
async function itemFilterFor(req, baseQuery) {
  const filter = { ...baseQuery }
  if (req.query.type) filter.type = req.query.type
  if (req.query.tag) filter.tagIndex = await blindIndexFor(req.user.id, req.query.tag, 'Item.tags')
  if (req.query.spaceId) filter.spaceId = req.query.spaceId
  return filter
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
      if (tag) query.tagIndex = await blindIndexFor(req.user.id, tag, 'Item.tags')
      if (spaceId) query.spaceId = spaceId
      if (cursor) {
        query._id = sortDirection === -1 ? { $lt: cursor } : { $gt: cursor }
      }

      const items = await Item.find(query).sort({ _id: sortDirection }).limit(limit + 1)
      const hasMore = items.length > limit
      const page = hasMore ? items.slice(0, limit) : items

      return res.json({
        items: page.map(presentItem),
        nextCursor: hasMore ? page[page.length - 1]._id : null,
      })
    }

    // ── NON-EMPTY SEARCH ──
    const limit = Math.min(parseInt(req.query.limit) || 40, 50)

    // 1. Primary path for Deep Recall / Vector Search
    if (mode === 'vector' || mode === 'deep') {
      try {
        const queryVector = await generateEmbedding(q, 'RETRIEVAL_QUERY')
        const vectorResults = await executeVectorSearch({
          userId: req.user.id,
          queryText: q,
          queryVector,
          limit,
          type: req.query.type,
          tag: req.query.tag,
          spaceId: req.query.spaceId,
        })

        // Pages inside documents (best-effort: needs the Atlas chunk index)
        const docHits = queryVector
          ? await searchDocumentsByVector({ userId: req.user.id, queryVector, itemFilter: await itemFilterFor(req, baseQuery), limit, q })
              .catch(err => { console.warn('[smartSearch] chunk vector search unavailable:', err.message); return [] })
          : []

        const merged = new Map(vectorResults.map(i => [String(i._id), { out: presentItem(i), score: i.score || 0 }]))
        for (const h of docHits) {
          const id = String(h.item._id)
          const prev = merged.get(id)
          if (!prev || prev.score < h.score) merged.set(id, { out: { ...presentItem(h.item), score: h.score, match: h.match }, score: h.score })
          else prev.out.match ??= h.match
        }
        if (merged.size > 0) {
          const items = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit).map(m => m.out)
          return res.json({ items, mode: 'vector' })
        }
      } catch (vectorErr) {
        console.warn('[smartSearch] Vector search failed, falling back to text search:', vectorErr.message)
      }
    }

    // 2. Keyword search: item fields (in-app, decrypted) + every page of every
    //    document (encrypted inverted index), merged by score
    const keywordQuery = await itemFilterFor(req, baseQuery)
    const [itemHits, docHits] = await Promise.all([
      executeKeywordSearch({ baseQuery: keywordQuery, q, limit, sortDirection, withScores: true }),
      searchDocumentsByKeyword({ userId: req.user.id, q, itemFilter: keywordQuery }),
    ])

    const merged = new Map()
    for (const h of itemHits) merged.set(String(h.item._id), { item: h.item, score: h.score })
    for (const h of docHits) {
      const id = String(h.item._id)
      const prev = merged.get(id)
      merged.set(id, { item: h.item, score: (prev?.score || 0) + h.score, match: h.match })
    }
    const items = [...merged.values()]
      .sort((a, b) => b.score - a.score || sortDirection * (a.item.createdAt - b.item.createdAt))
      .slice(0, limit)
      .map(m => (m.match ? { ...presentItem(m.item), match: m.match } : presentItem(m.item)))

    return res.json({ items, mode: 'text' })
  } catch (err) {
    console.error('[smartSearch]', err.message)
    return res.status(500).json({ error: 'Search failed', details: err.message })
  }
}

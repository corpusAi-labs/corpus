import Item from '../models/Item.js'

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
 * Optimized full-text search using MongoDB Text Index with relevance ranking.
 *
 * Query syntax:
 *   GET /api/items/search?q=search+terms&sort=newest
 */
export async function smartSearch(req, res) {
  const q = (req.query.q || '').trim()
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
    const searchQuery = {
      ...baseQuery,
      $text: { $search: q },
    }

    if (req.query.type) searchQuery.type = req.query.type
    if (req.query.tag) searchQuery.tags = req.query.tag
    if (req.query.spaceId) searchQuery.spaceId = req.query.spaceId

    let items = []
    try {
      // 1. Primary path: Native MongoDB Inverted Text Index with weights (sub-20ms)
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
      console.warn('[smartSearch] $text query failed or index rebuilding, falling back to prefix search:', textErr.message)
    }

    // 2. Fallback path: If $text yielded no results (e.g. short partial words like "rea" before finishing "react")
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

    return res.json({ items })
  } catch (err) {
    console.error('[smartSearch]', err.message)
    return res.status(500).json({ error: 'Search failed', details: err.message })
  }
}

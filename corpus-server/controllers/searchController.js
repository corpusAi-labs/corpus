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
 * Simple plain text search with relevance ranking.
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
    const terms = buildSearchQuery(q) // gives all terms (array)
    if (terms.length === 0) {
      return res.json({ items: [] })
    }

    // Build the $or regex query to find any matching items
    const orConditions = terms.flatMap(term => {
      const escaped = escapeRegex(term)
      const regex = new RegExp(escaped, 'i')
      return [
        { tags: { $regex: regex } },
        { title: { $regex: regex } },
        { summary: { $regex: regex } },
        { note: { $regex: regex } },
        { url: { $regex: regex } },
        { content: { $regex: regex } }
        
      ]
    })

    const query = {
      ...baseQuery,
      $or: orConditions,
    }

    // Respect active filters during search if provided
    if (req.query.type) query.type = req.query.type
    if (req.query.tag) query.tags = req.query.tag
    if (req.query.spaceId) query.spaceId = req.query.spaceId

    // Retrieve matching candidates (up to 500)
    const matchedItems = await Item.find(query).limit(500)

    // Score candidates in memory
    const ranked = matchedItems.map(item => {
      let uniqueMatchedTerms = 0
      let fieldScore = 0

      for (const term of terms) {
        const escaped = escapeRegex(term)
        const regex = new RegExp(escaped, 'i')
        let matchedThisTerm = false


         // 1. Note (highest points as it was manual)
        if (item.note && regex.test(item.note)) {
          fieldScore += 11
          matchedThisTerm = true
        }

        // 2. Tags (10 points)
        const tagsMatch = (item.tags || []).some(t => regex.test(t))
        if (tagsMatch) {
          fieldScore += 10
          matchedThisTerm = true
        }

        // 3. Title (8 points)
        if (item.title && regex.test(item.title)) {
          fieldScore += 8
          matchedThisTerm = true
        }

        // 4. URL (1 point)
        if (item.url && regex.test(item.url)) {
          fieldScore += 5
          matchedThisTerm = true
        }

        // 4. Summary (3 points)
        if (item.summary && regex.test(item.summary)) {
          fieldScore += 3
          matchedThisTerm = true
        }

        // 6. Content (1 points)
        if (item.content && regex.test(item.content)) {
          fieldScore += 1
          matchedThisTerm = true
        }


        if (matchedThisTerm) {
          uniqueMatchedTerms++
        }
      }

      // Relevance score weights matching more search terms highest
      const score = (uniqueMatchedTerms * 100) + fieldScore
      return { item, score }
    })

    // Sort by relevance score primarily, and createdAt secondarily
    ranked.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      const timeA = new Date(a.item.createdAt).getTime()
      const timeB = new Date(b.item.createdAt).getTime()
      return sortDirection === 1 ? timeA - timeB : timeB - timeA
    })

    const finalItems = ranked.map(r => r.item).slice(0, 40)
    return res.json({ items: finalItems })
  } catch (err) {
    console.error('[smartSearch]', err.message)
    return res.status(500).json({ error: 'Search failed', details: err.message })
  }
}

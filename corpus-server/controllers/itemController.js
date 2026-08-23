// import { z } from 'zod'
// import Item from '../models/Item.js'
// import User from '../models/User.js'
// import { scrapeUrl } from '../services/scraper.js'
// import { generateSummaryAndTags } from '../services/openai.js'

// const createItemSchema = z.object({
//   type: z.enum(['link', 'image', 'note', 'quote']),
//   url: z.string().url().optional(),
//   title: z.string().max(300).optional(),
//   content: z.string().max(5000).optional(),
//   thumbnailUrl: z.string().url().optional(),
//   spaceId: z.string().nullable().optional(),
// })

// export async function createItem(req, res) {
//   const parsed = createItemSchema.safeParse(req.body)
//   if (!parsed.success) {
//     return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
//   }
//   const { type, url, title, content, thumbnailUrl, spaceId } = parsed.data

//   try {
//     // ── CREDIT CHECK ──
//     const user = await User.findById(req.user.id)
//     if (!user) return res.status(401).json({ error: 'User not found' })
//     if (user.credits <= 0) {
//       return res.status(402).json({
//         error: 'NO_CREDITS',
//         message: 'You have used all your saves. Upgrade your plan to keep saving.',
//       })
//     }

//     let itemData = {
//       userId: req.user.id,
//       type, title, content, thumbnailUrl,
//       spaceId: spaceId || null,
//       status: 'pending_ai',
//     }

//     if (type === 'link') {
//       if (!url) return res.status(400).json({ error: 'url is required for type "link"' })
//       const existing = await Item.findOne({ userId: req.user.id, url, deletedAt: null })
//       if (existing) return res.status(409).json({ error: 'Already saved', item: existing })
//       const meta = await scrapeUrl(url)
//       itemData = { ...itemData, url, title: title || meta.title, content: meta.description, thumbnailUrl: meta.thumbnailUrl, faviconUrl: meta.faviconUrl }
//     }

//     if ((type === 'note' || type === 'quote') && !content) {
//       return res.status(400).json({ error: 'content is required' })
//     }
//     if ((type === 'note' || type === 'quote') && !itemData.title) {
//       itemData.title = content.slice(0, 60) + (content.length > 60 ? '…' : '')
//     }
//     if (type === 'image' && !thumbnailUrl) {
//       return res.status(400).json({ error: 'thumbnailUrl is required for images' })
//     }

//     // ── DEDUCT CREDIT & SAVE ──
//     await User.findByIdAndUpdate(req.user.id, { $inc: { credits: -1 } })
//     const item = await Item.create(itemData)
//     res.status(201).json({ item })

//     generateSummaryAndTags({ title: itemData.title, content: itemData.content, url: itemData.url, type: itemData.type })
//       .then(async ({ summary, tags, contentType, failed }) => {
//         const update = { status: 'ready', aiFailed: !!failed }
//         if (summary) update.summary = summary
//         if (tags.length) update.tags = tags
//         if (contentType) update.contentType = contentType
//         await Item.findByIdAndUpdate(item._id, update)
//       })
//       .catch(async (err) => {
//         console.error('[ai error]', err.message)
//         await Item.findByIdAndUpdate(item._id, { status: 'ready', aiFailed: true }).catch(() => {})
//       })

//   } catch (err) {
//     console.error('[createItem]', err.message)
//     return res.status(500).json({ error: 'Failed to save item' })
//   }
// }

// export async function listItems(req, res) {
//   try {
//     const limit = Math.min(parseInt(req.query.limit) || 20, 50)
//     const { cursor, type, tag, spaceId } = req.query
//     const query = { userId: req.user.id, archived: false, deletedAt: null }
//     if (type) query.type = type
//     if (tag) query.tags = tag
//     if (spaceId) query.spaceId = spaceId
//     if (cursor) query._id = { $lt: cursor }
//     const items = await Item.find(query).sort({ _id: -1 }).limit(limit + 1)
//     const hasMore = items.length > limit
//     const page = hasMore ? items.slice(0, limit) : items
//     return res.json({ items: page, nextCursor: hasMore ? page[page.length - 1]._id : null })
//   } catch (err) {
//     return res.status(500).json({ error: 'Failed to fetch items' })
//   }
// }

// export async function getItem(req, res) {
//   try {
//     const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null })
//     if (!item) return res.status(404).json({ error: 'Item not found' })
//     return res.json({ item })
//   } catch { return res.status(400).json({ error: 'Invalid item id' }) }
// }

// export async function updateItem(req, res) {
//   const allowedFields = ['title', 'content', 'tags', 'archived', 'note', 'summary', 'spaceId']
//   const updates = {}
//   for (const field of allowedFields) {
//     if (req.body[field] !== undefined) updates[field] = req.body[field]
//   }
//   try {
//     const item = await Item.findOneAndUpdate(
//       { _id: req.params.id, userId: req.user.id, deletedAt: null },
//       updates, { new: true }
//     )
//     if (!item) return res.status(404).json({ error: 'Item not found' })
//     return res.json({ item })
//   } catch { return res.status(400).json({ error: 'Invalid update' }) }
// }

// export async function deleteItem(req, res) {
//   try {
//     const item = await Item.findOneAndUpdate(
//       { _id: req.params.id, userId: req.user.id, deletedAt: null },
//       { deletedAt: new Date() }, { new: true }
//     )
//     if (!item) return res.status(404).json({ error: 'Item not found' })
//     return res.json({ success: true })
//   } catch { return res.status(400).json({ error: 'Invalid item id' }) }
// }


// // GET /api/items/drift?limit=20
// // Returns a random sample of items for the Drift session
// export async function driftItems(req, res) {
//   try {
//     const limit = Math.min(parseInt(req.query.limit) || 20, 50)
//     const count = await Item.countDocuments({
//       userId: req.user.id,
//       archived: false,
//       deletedAt: null,
//     })
//     if (count === 0) return res.json({ items: [] })

//     // MongoDB $sample for true random
//     const mongoose = await import('mongoose')
//     const uid = new mongoose.default.Types.ObjectId(req.user.id)
//     const items = await Item.aggregate([
//       { $match: { userId: uid, archived: false, deletedAt: { $eq: null } } },
//       { $sample: { size: limit } },
//     ])
//     return res.json({ items })
//   } catch (err) {
//     console.error('[driftItems]', err.message)
//     return res.status(500).json({ error: 'Failed to fetch drift items' })
//   }
// }


// // POST /api/items/:id/retry-ai
// // Manually re-triggers AI summary/tag generation for an item that
// // never got tagged (network blip, rate limit, etc).
// export async function retryAI(req, res) {
//   try {
//     const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null })
//     if (!item) return res.status(404).json({ error: 'Item not found' })

//     await Item.findByIdAndUpdate(item._id, { status: 'pending_ai', aiFailed: false })
//     res.json({ success: true })

//     generateSummaryAndTags({ title: item.title, content: item.content, url: item.url, type: item.type })
//       .then(async ({ summary, tags, contentType, failed }) => {
//         const update = { status: 'ready', aiFailed: !!failed }
//         if (summary) update.summary = summary
//         if (tags.length) update.tags = tags
//         if (contentType) update.contentType = contentType
//         await Item.findByIdAndUpdate(item._id, update)
//       })
//       .catch(async (err) => {
//         console.error('[ai retry error]', err.message)
//         await Item.findByIdAndUpdate(item._id, { status: 'ready', aiFailed: true }).catch(() => {})
//       })
//   } catch (err) {
//     return res.status(500).json({ error: 'Retry failed' })
//   }
// }


import { z } from 'zod'
import Item from '../models/Item.js'
import User from '../models/User.js'
import { scrapeUrl } from '../services/scraper.js'
import { generateSummaryAndTags } from '../services/openai.js'

const createItemSchema = z.object({
  type: z.enum(['link', 'image', 'note', 'quote']),
  url: z.string().url().optional(),
  title: z.string().max(300).optional(),
  content: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url().optional(),
  spaceId: z.string().nullable().optional(),
})


// Background processor helper for AI summarization & tagging
export async function processItemAI(item) {
  const itemId = item._id.toString()
  console.log(`[ai] starting item ${itemId}`)
  
  try {
    // Verify item still exists and isn't deleted
    const currentItem = await Item.findOne({ _id: item._id, deletedAt: null })
    if (!currentItem) {
      console.warn(`[ai] item ${itemId} was deleted or not found before AI processing started`)
      return
    }

    const { title, content, url, type } = currentItem
    console.log(`[ai] input details: type=${type}, titleLength=${title?.length || 0}, contentLength=${content?.length || 0}`)
    
    // Call Groq / Llama pipeline
    const { summary, tags, contentType, failed } = await generateSummaryAndTags({
      title,
      content,
      url,
      type,
    })

    const update = { status: 'ready', aiFailed: !!failed }
    update.summary = summary || ''
    update.tags = tags || []
    if (contentType) update.contentType = contentType

    const updatedItem = await Item.findOneAndUpdate(
      { _id: item._id, deletedAt: null },
      update,
      { new: true }
    )

    if (updatedItem) {
      if (failed) {
        console.warn(`[ai] item ${itemId} processing completed with failure (aiFailed: true)`)
      } else {
        console.log(`[ai] item ${itemId} successfully completed processing: status=ready, aiFailed=false`)
      }
    } else {
      console.warn(`[ai] item ${itemId} was deleted during background processing`)
    }
  } catch (err) {
    console.error(`[ai] unexpected failure during background processing for item ${itemId}:`, err.message)
    await Item.findOneAndUpdate(
      { _id: item._id, deletedAt: null },
      { status: 'ready', aiFailed: true }
    ).catch(dbErr => {
      console.error(`[ai] failed to mark item ${itemId} as failed in DB:`, dbErr.message)
    })
  }
}

export async function createItem(req, res) {
  const parsed = createItemSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  const { type, url, title, content, thumbnailUrl, spaceId } = parsed.data

  
  try {
    // ── ATOMIC CREDIT DEDUCTION ──
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, credits: { $gt: 0 } }
     
    )
    if (!user) {
      const exists = await User.findById(req.user.id)
      if (!exists) return res.status(401).json({ error: 'User not found' })
      return res.status(402).json({
        error: 'NO_CREDITS',
        message: 'You have used all your saves. Upgrade your plan to keep saving.',
      })
    }
    

    let itemData = {
      userId: req.user.id,
      type, title, content, thumbnailUrl,
      spaceId: spaceId || null,
      status: 'pending_ai',
    }

    if (type === 'link') {
      if (!url) {
        return res.status(400).json({ error: 'url is required for type "link"' })
      }
      const existing = await Item.findOne({ userId: req.user.id, url, deletedAt: null })
      if (existing) {
        return res.status(409).json({ error: 'Already saved', item: existing })
      }
      const meta = await scrapeUrl(url)
      itemData = {
        ...itemData,
        url,
        title: title || meta.title,
        content: meta.content || meta.description || '',
        thumbnailUrl: meta.thumbnailUrl,
        faviconUrl: meta.faviconUrl
      }
    }

    if ((type === 'note' || type === 'quote') && !content) {
      return res.status(400).json({ error: 'content is required' })
    }
    if ((type === 'note' || type === 'quote') && !itemData.title) {
      itemData.title = content.slice(0, 60) + (content.length > 60 ? '…' : '')
    }
    if (type === 'image' && !thumbnailUrl) {
      return res.status(400).json({ error: 'thumbnailUrl is required for images' })
    }
     //deduct credit
     await User.findByIdAndUpdate(
      req.user.id,
      {
        $inc: {
          credits: -1
        }
      }
    )

    // Save the item
    const item = await Item.create(itemData)
    res.status(201).json({ item })

    // Kick off AI processing in the background asynchronously
    processItemAI(item).catch(err => {
      console.error(`[ai background error] for item ${item._id}:`, err.message)
    })

  } catch (err) {
    console.error('[createItem]', err.message)
    return res.status(500).json({ error: 'Failed to save item' })
  }
}

export async function listItems(req, res) {
  try {
     const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const { cursor, type, tag, spaceId, sort } = req.query
    const sortDirection = sort === 'oldest' ? 1 : -1
    const query = { userId: req.user.id, archived: false, deletedAt: null }
    if (type) query.type = type
    if (tag) query.tags = tag
    if (spaceId) query.spaceId = spaceId
    if (cursor) {
      query._id = sortDirection === -1 ? { $lt: cursor } : { $gt: cursor }
    }
    const items = await Item.find(query).sort({ _id: sortDirection }).limit(limit + 1)
    const hasMore = items.length > limit
    const page = hasMore ? items.slice(0, limit) : items
    return res.json({ items: page, nextCursor: hasMore ? page[page.length - 1]._id : null })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch items' })
  }
}

export async function getItem(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    return res.json({ item })
  } catch { return res.status(400).json({ error: 'Invalid item id' }) }
}

export async function updateItem(req, res) {
  const allowedFields = ['title', 'content', 'tags', 'archived', 'note', 'summary', 'spaceId']
  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field]
  }
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, deletedAt: null },
      updates, { new: true }
    )
    if (!item) return res.status(404).json({ error: 'Item not found' })
    return res.json({ item })
  } catch { return res.status(400).json({ error: 'Invalid update' }) }
}

export async function deleteItem(req, res) {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id, deletedAt: null },
      { deletedAt: new Date() }, { new: true }
    )
    if (!item) return res.status(404).json({ error: 'Item not found' })
    return res.json({ success: true })
  } catch { return res.status(400).json({ error: 'Invalid item id' }) }
}

// GET /api/items/drift?limit=20
// Returns a random sample of items for the Drift session
export async function driftItems(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)
    const count = await Item.countDocuments({
      userId: req.user.id,
      archived: false,
      deletedAt: null,
    })
    if (count === 0) return res.json({ items: [] })

    // MongoDB $sample for true random
    const mongoose = await import('mongoose')
    const uid = new mongoose.default.Types.ObjectId(req.user.id)
    const items = await Item.aggregate([
      { $match: { userId: uid, archived: false, deletedAt: { $eq: null } } },
      { $sample: { size: limit } },
    ])
    return res.json({ items })
  } catch (err) {
    console.error('[driftItems]', err.message)
    return res.status(500).json({ error: 'Failed to fetch drift items' })
  }
}

// POST /api/items/:id/retry-ai
// Manually re-triggers AI summary/tag generation for an item that
// never got tagged (network blip, rate limit, etc).
export async function retryAI(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null })
    if (!item) return res.status(404).json({ error: 'Item not found' })

    await Item.findByIdAndUpdate(item._id, { status: 'pending_ai', aiFailed: false })
    res.json({ success: true })

    processItemAI(item).catch(err => {
      console.error(`[ai retry background error] for item ${item._id}:`, err.message)
    })
  } catch (err) {
    console.error('[retryAI]', err.message)
    return res.status(500).json({ error: 'Retry failed' })
  }
}

export async function listAllTags(req, res) {
  try {
    const tags = await Item.distinct('tags', {
      userId: req.user.id,
      deletedAt: null,
      archived: false,
    })
    const sortedTags = tags.filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return res.json({ tags: sortedTags })
  } catch (err) {
    console.error('[listAllTags]', err.message)
    return res.status(500).json({ error: 'Failed to fetch tags' })
  }
}
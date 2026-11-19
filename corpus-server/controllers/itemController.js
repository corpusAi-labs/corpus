
import { z } from 'zod'
import Item from '../models/Item.js'
import User from '../models/User.js'
import { scrapeUrl } from '../services/scraper.js'
import { generateSummaryAndTags } from '../services/openai.js'
import { buildItemEmbeddingText, generateEmbedding } from '../services/embedding.js'
import { blindIndexFor } from '../services/crypto.js'
import { runAsSystem } from '../services/audit.js'
import { isMediaRef, isOwnedRef, presentItem } from '../services/media.js'
import { aiAllowed } from '../services/ai/router.js'
import { enqueue } from '../services/queue.js'
import { PDF_JOB } from '../jobs/processPdf.js'
import ItemChunk from '../models/ItemChunk.js'

const httpUrl = z.string().url().refine(u => /^https?:\/\//i.test(u), 'must be an http(s) URL')

const createItemSchema = z.object({
  type: z.enum(['link', 'image', 'note', 'quote']),
  url: httpUrl.optional(),
  title: z.string().max(300).optional(),
  content: z.string().max(5000).optional(),
  thumbnailUrl: z.string().max(2048).optional(), // http(s) URL or the caller's own private media ref
  spaceId: z.string().nullable().optional(),
})


// Background processor helper for AI summarization & tagging
// it goto generateTagandSummary function in services OpenAI
export function processItemAI(item) {
  // Runs after the response is sent, as the `system` actor, so the decrypts it
  // performs are attributed honestly in the user's access log.
  return runAsSystem('AI tagging & summary', () => processItemAIInner(item))
}

async function processItemAIInner(item) {
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

    // AI routing policy: opted-out items, or private items without an approved provider, skip AI entirely
    if (!aiAllowed(currentItem, 'groq')) {
      await Item.updateOne({ _id: item._id }, { status: 'ready', aiFailed: false })
      console.log(`[ai] item ${itemId} skipped by AI routing policy`)
      return
    }
    
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
      { _id: item._id, userId: currentItem.userId, deletedAt: null },
      update,
      { new: true }
    )

    if (updatedItem) {
      if (failed) {
        console.warn(`[ai] item ${itemId} processing completed with failure (aiFailed: true)`)
      } else {
        console.log(`[ai] item ${itemId} successfully completed processing: status=ready, aiFailed=false`)
      }

      // Generate 768-dim vector embedding for Deep Recall
      if (aiAllowed(updatedItem, 'gemini')) try {
        const textToEmbed = buildItemEmbeddingText({
          title: updatedItem.title || title,
          contentType: updatedItem.contentType || contentType,
          tags: updatedItem.tags || tags,
          summary: updatedItem.summary || summary,
          note: currentItem.note,
          content: currentItem.content,
          url: currentItem.url,
        })
        if (textToEmbed) {
          const embedding = await generateEmbedding(textToEmbed, 'RETRIEVAL_DOCUMENT')
          if (embedding) {
            await Item.updateOne({ _id: item._id }, { embedding })
            console.log(`[embedding] Vectorized item ${itemId} (768 dimensions)`)
          }
        }
      } catch (embedErr) {
        console.warn(`[embedding] Failed to vectorize item ${itemId}:`, embedErr.message)
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
  if (thumbnailUrl && (isMediaRef(thumbnailUrl) ? !isOwnedRef(thumbnailUrl, req.user.id) : !/^https?:\/\//i.test(thumbnailUrl))) {
    return res.status(400).json({ error: 'Invalid thumbnailUrl' })
  }

  
  try {
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
      const urlHash = await blindIndexFor(req.user.id, url, 'Item.url')
      const existing = await Item.findOne({ userId: req.user.id, urlHash, deletedAt: null })
      if (existing) {
        return res.status(409).json({ error: 'Already saved', item: presentItem(existing) })
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

    // ── ATOMIC CREDIT DEDUCTION ──
    // Atomically checks credits > 0 and decrements by 1 in a single MongoDB command
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, credits: { $gt: 0 } },
      { $inc: { credits: -1 } },
      { new: true }
    )
    if (!user) {
      const exists = await User.findById(req.user.id)
      if (!exists) return res.status(401).json({ error: 'User not found' })
      return res.status(402).json({
        error: 'NO_CREDITS',
        message: 'You have used all your saves. Upgrade your plan to keep saving.',
      })
    }

    // Save the item with refund rollback if creation fails
    let item
    try {
      item = await Item.create(itemData)
    } catch (createErr) {
      // Refund the deducted credit if DB write fails
      await User.findByIdAndUpdate(req.user.id, { $inc: { credits: 1 } })
      throw createErr
    }

    res.status(201).json({ item: presentItem(item), remainingCredits: user.credits })

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
    if (tag) query.tagIndex = await blindIndexFor(req.user.id, tag, 'Item.tags')
    if (spaceId) query.spaceId = spaceId
    if (cursor) {
      query._id = sortDirection === -1 ? { $lt: cursor } : { $gt: cursor }
    }
    const items = await Item.find(query).sort({ _id: sortDirection }).limit(limit + 1)
    const hasMore = items.length > limit
    const page = hasMore ? items.slice(0, limit) : items
    return res.json({ items: page.map(presentItem), nextCursor: hasMore ? page[page.length - 1]._id : null })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch items' })
  }
}

export async function getItem(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    return res.json({ item: presentItem(item) })
  } catch { return res.status(400).json({ error: 'Invalid item id' }) }
}

export async function updateItem(req, res) {
  const allowedFields = ['title', 'content', 'tags', 'archived', 'note', 'summary', 'spaceId', 'aiOptOut']
  if (req.body.aiOptOut !== undefined && typeof req.body.aiOptOut !== 'boolean') {
    return res.status(400).json({ error: 'aiOptOut must be a boolean' })
  }
  if (req.body.tags !== undefined && !(Array.isArray(req.body.tags) && req.body.tags.every(t => typeof t === 'string' && t.length <= 100))) {
    return res.status(400).json({ error: 'tags must be an array of strings' })
  }
  for (const f of ['title', 'content', 'note', 'summary']) {
    if (req.body[f] !== undefined && typeof req.body[f] !== 'string') {
      return res.status(400).json({ error: `${f} must be a string` })
    }
  }
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

    // "Keep away from AI" switched on: drop every vector derived from this item
    if (req.body.aiOptOut === true) {
      await Item.updateOne({ _id: item._id }, { $unset: { embedding: 1 } })
      await ItemChunk.updateMany({ itemId: item._id, userId: req.user.id }, { $unset: { embedding: 1 } })
    }
    // Switched back off: enrich it now
    if (req.body.aiOptOut === false) {
      await Item.updateOne({ _id: item._id }, { status: 'pending_ai', aiFailed: false })
      item.status = 'pending_ai'
      if (item.type === 'pdf') await enqueue(PDF_JOB, { itemId: String(item._id) }, { userId: req.user.id })
      else processItemAI(item).catch(err => console.error('[ai] re-enable failed:', err.message))
    }

    // If semantic text changed, refresh embedding asynchronously in background
    const semanticFields = ['title', 'content', 'tags', 'note', 'summary']
    if (aiAllowed(item, 'gemini') && semanticFields.some(f => req.body[f] !== undefined)) {
      setImmediate(async () => {
        try {
          const text = buildItemEmbeddingText(item)
          if (text) {
            const embedding = await generateEmbedding(text, 'RETRIEVAL_DOCUMENT')
            if (embedding) {
              await Item.updateOne({ _id: item._id }, { embedding })
            }
          }
        } catch (e) {
          console.warn('[embedding] Async update failed:', e.message)
        }
      })
    }

    return res.json({ item: presentItem(item) })
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
      { $project: { embedding: 0, tagIndex: 0, urlHash: 0 } },
    ])
    return res.json({ items: items.map(presentItem) })
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
    //first set the status to pending ai and set the resp 
    if (item.aiOptOut) return res.status(409).json({ error: 'AI is turned off for this item.' })
    await Item.findByIdAndUpdate(item._id, { status: 'pending_ai', aiFailed: false })
    if (item.type === 'pdf') {
      await Item.updateOne({ _id: item._id }, { $set: { 'processing.stage': 'queued', 'processing.progress': 0, 'processing.error': '' } })
      await enqueue(PDF_JOB, { itemId: String(item._id) }, { userId: req.user.id })
      return res.json({ success: true })
    }
    res.json({ success: true })
   // now call the ai 
    processItemAI(item).catch(err => {
      console.error(`[ai retry background error] for item ${item._id}:`, err.message)
    })
  } catch (err) {
    console.error('[retryAI]', err.message)
    return res.status(500).json({ error: 'Retry failed' })
  }
}
//when a client makes a GET request to the /tags
export async function listAllTags(req, res) {
  try {
    // Tags are encrypted at rest, so distinct() would return ciphertext.
    // Fetch them (decrypted by the model plugin) and dedupe in the app.
    const items = await Item.find({
      userId: req.user.id,
      deletedAt: null,
      archived: false,
    }).select('tags')
    const tags = [...new Set(items.flatMap(i => i.tags || []))]
    const sortedTags = tags.filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    return res.json({ tags: sortedTags })
  } catch (err) {
    console.error('[listAllTags]', err.message)
    return res.status(500).json({ error: 'Failed to fetch tags' })
  }
}
import Item from '../models/Item.js'
import ItemChunk from '../models/ItemChunk.js'
import User from '../models/User.js'
import { registerJob, heartbeat, PermanentJobError } from '../services/queue.js'
import { runAsSystem } from '../services/audit.js'
import { getDecryptedFile } from '../services/storage/index.js'
import { extractPdfPages, PdfError } from '../services/pdf/index.js'
import { chunkPages, totalTextLength } from '../services/pdf/chunker.js'
import { chunkIndexHashes } from '../services/search/documentSearch.js'
import { getUserCipher } from '../services/crypto.js'
import { aiAllowed } from '../services/ai/router.js'
import { summarizeDocument } from '../services/ai/documentSummary.js'
import { generateEmbeddingsBatch, generateEmbedding, buildItemEmbeddingText } from '../services/embedding.js'
import { planFor } from '../config/plans.js'

export const PDF_JOB = 'pdf.process'
const MIN_TEXT_CHARS = 40 // below this we treat the PDF as scanned / image-only

const setProgress = (itemId, stage, progress, extra = {}) =>
  Item.updateOne({ _id: itemId }, { $set: { 'processing.stage': stage, 'processing.progress': progress, ...extra } })

/**
 * Idempotent pipeline (safe to retry from the start):
 *   decrypt file → extract text (sandboxed) → chunk → encrypted word index
 *   → [AI allowed] chunk embeddings → map-reduce summary → item embedding
 */
async function run({ itemId }, job) {
  await runAsSystem('Reading your PDF to make it searchable', async () => {
    const item = await Item.findOne({ _id: itemId, deletedAt: null }).select('+file.hashIndex')
    if (!item) return // deleted meanwhile: nothing to do
    const userId = item.userId
    const user = await User.findById(userId).select('plan')
    const plan = planFor(user)

    // 1. Extract
    await setProgress(itemId, 'extracting', 5)
    const buffer = await getDecryptedFile({ userId, itemId, key: item.file.storageKey })
    let extracted
    try {
      extracted = await extractPdfPages(buffer, item.file.pagesIndexed)
    } catch (err) {
      if (err instanceof PdfError && err.code !== 'timeout') throw new PermanentJobError(`We couldn't read this PDF (${err.code}).`, err.code)
      throw err
    }
    await heartbeat(job._id)

    // 2. Chunk + encrypted inverted index (local; never leaves our servers)
    await setProgress(itemId, 'indexing', 30)
    const chunks = chunkPages(extracted.pages)
    const cipher = await getUserCipher(userId)
    await ItemChunk.deleteMany({ itemId }) // idempotent on retry
    for (let i = 0; i < chunks.length; i += 50) {
      await ItemChunk.create(chunks.slice(i, i + 50).map(c => ({
        userId,
        itemId,
        ordinal: c.ordinal,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        pageOffsets: c.pageOffsets,
        text: c.text,
        tokenIndex: chunkIndexHashes(cipher, c.text),
      })))
    }

    const noText = totalTextLength(extracted.pages) < MIN_TEXT_CHARS
    const truncated = item.file.pagesIndexed < item.file.pageCount
    const note = noText ? 'no_text' : truncated ? 'truncated' : ''

    // 3. AI enrichment — only if the user and the routing policy allow it
    const update = { status: 'ready', aiFailed: false, 'processing.note': note }
    if (!noText && aiAllowed(item, 'gemini')) {
      await setProgress(itemId, 'indexing', 45)
      try {
        const vectors = await generateEmbeddingsBatch(chunks.map(c => c.text))
        await ItemChunk.bulkWrite(vectors.map((v, i) => v && {
          updateOne: { filter: { itemId, ordinal: chunks[i].ordinal }, update: { $set: { embedding: v } } },
        }).filter(Boolean))
      } catch (err) {
        console.warn(`[pdf] chunk embeddings failed for ${itemId}:`, err.message) // keyword search still works
      }
      await heartbeat(job._id)
    }

    if (!noText && aiAllowed(item, 'groq')) {
      await setProgress(itemId, 'summarizing', 70)
      try {
        const s = await summarizeDocument({ title: item.title, chunks, maxSections: plan.summarySections })
        Object.assign(update, { tldr: s.tldr, summary: s.summary, keyPoints: s.keyPoints, tags: s.tags, docType: s.docType })
      } catch (err) {
        console.warn(`[pdf] summary failed for ${itemId}:`, err.message)
        update.aiFailed = true
      }
    }

    update['processing.stage'] = 'done'
    update['processing.progress'] = 100
    const saved = await Item.findOneAndUpdate({ _id: itemId, userId, deletedAt: null }, update, { new: true })

    // 4. Item-level vector (title + summary + tags) for Deep Recall over whole documents
    if (saved && !noText && aiAllowed(saved, 'gemini')) {
      const text = buildItemEmbeddingText(saved)
      const embedding = text && (await generateEmbedding(text, 'RETRIEVAL_DOCUMENT'))
      if (embedding) await Item.updateOne({ _id: itemId }, { embedding })
    }
  })
}

/** Out of retries: tell the user, and refund the credits we charged. */
async function onFailed({ itemId }, err) {
  const item = await Item.findOneAndUpdate(
    { _id: itemId },
    { $set: { status: 'ready', aiFailed: true, 'processing.stage': 'failed', 'processing.error': err.message.slice(0, 200) } },
    { new: true }
  )
  const refund = item?.file?.creditsCharged || 0
  if (refund) {
    await User.updateOne({ _id: item.userId }, { $inc: { credits: refund } })
    await Item.updateOne({ _id: itemId }, { $set: { 'file.creditsCharged': 0 } })
  }
}

export function registerPdfJobs() {
  registerJob(PDF_JOB, { run, onFailed })
}

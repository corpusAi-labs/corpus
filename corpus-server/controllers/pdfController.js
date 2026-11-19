import crypto from 'crypto'
import mongoose from 'mongoose'
import Item from '../models/Item.js'
import ItemChunk from '../models/ItemChunk.js'
import User from '../models/User.js'
import { planFor, creditsForPages } from '../config/plans.js'
import { inspectPdf, PdfError } from '../services/pdf/index.js'
import { putEncryptedFile, getDecryptedFile, deleteFile } from '../services/storage/index.js'
import { blindIndexFor } from '../services/crypto.js'
import { enqueue } from '../services/queue.js'
import { presentItem } from '../services/media.js'
import { PDF_JOB } from '../jobs/processPdf.js'

const MB = 1024 * 1024
const PDF_ERRORS = {
  not_pdf: [415, "That file isn't a PDF."],
  encrypted: [422, 'This PDF is password-protected. Remove the password and try again.'],
  invalid: [422, "This PDF looks damaged and couldn't be read."],
  crashed: [422, "This PDF couldn't be read safely."],
  timeout: [422, 'This PDF took too long to read.'],
}

const cleanTitle = name =>
  String(name || 'Untitled PDF').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || 'Untitled PDF'

/**
 * POST /api/items/pdf   (multipart: file, title?, spaceId?, aiOptOut?)
 *
 * Fast path only: validate → price → charge → encrypt+store → enqueue.
 * The heavy lifting (extraction, indexing, AI) happens in the job queue, and
 * the card shows live progress while it runs.
 */
export async function uploadPdf(req, res) {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Choose a PDF to upload.' })
  const userId = req.user.id
  const aiOptOut = req.body.aiOptOut === 'true' || req.body.aiOptOut === true
  const spaceId = req.body.spaceId && mongoose.isValidObjectId(req.body.spaceId) ? req.body.spaceId : null

  const user = await User.findById(userId).select('plan credits storageBytes')
  if (!user) return res.status(401).json({ error: 'User not found' })
  const plan = planFor(user)

  // ── Plan limits (cheap checks first) ──
  if (file.size > plan.pdfMaxBytes) {
    return res.status(413).json({
      error: `Your plan allows PDFs up to ${plan.pdfMaxBytes / MB} MB.`,
      code: 'PLAN_FILE_TOO_LARGE',
      limitBytes: plan.pdfMaxBytes,
    })
  }
  if ((user.storageBytes || 0) + file.size > plan.storageBytes) {
    return res.status(413).json({ error: "You've used all your file storage. Upgrade or delete files to make room.", code: 'STORAGE_FULL' })
  }

  // ── Duplicate detection: keyed hash of the file's SHA-256 ──
  const sha = crypto.createHash('sha256').update(file.buffer).digest('hex')
  const hashIndex = await blindIndexFor(userId, sha, 'Item.fileHash')
  const existing = await Item.findOne({ userId, 'file.hashIndex': hashIndex, deletedAt: null })
  if (existing) return res.status(409).json({ error: 'Already saved', item: presentItem(existing) })

  // ── Structural check + page count, in a sandboxed worker ──
  let numPages
  try {
    ;({ numPages } = await inspectPdf(file.buffer))
  } catch (err) {
    const [status, message] = PDF_ERRORS[err instanceof PdfError ? err.code : 'invalid'] || PDF_ERRORS.invalid
    return res.status(status).json({ error: message, code: `PDF_${(err.code || 'invalid').toUpperCase()}` })
  }
  const pagesIndexed = Math.min(numPages, plan.pdfMaxPages)
  const credits = creditsForPages(pagesIndexed)

  // ── Charge atomically (credits and storage in one update) ──
  const charged = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: credits } },
    { $inc: { credits: -credits, storageBytes: file.size } },
    { new: true }
  )
  if (!charged) {
    return res.status(402).json({
      error: 'NO_CREDITS',
      message: `This PDF needs ${credits} save${credits === 1 ? '' : 's'} (1 per 25 pages). Upgrade your plan to keep saving.`,
      creditsNeeded: credits,
    })
  }

  const itemId = new mongoose.Types.ObjectId()
  let storageKey
  try {
    storageKey = await putEncryptedFile({ userId, itemId, buffer: file.buffer })
    const item = await Item.create({
      _id: itemId,
      userId,
      spaceId,
      type: 'pdf',
      contentType: 'pdf',
      title: req.body.title?.trim()?.slice(0, 300) || cleanTitle(file.originalname),
      aiOptOut,
      status: 'pending_ai',
      file: {
        name: String(file.originalname || 'document.pdf').slice(0, 255),
        storageKey,
        sizeBytes: file.size,
        pageCount: numPages,
        pagesIndexed,
        hashIndex,
        creditsCharged: credits,
      },
      processing: { stage: 'queued', progress: 0, note: pagesIndexed < numPages ? 'truncated' : '' },
    })
    await enqueue(PDF_JOB, { itemId: String(itemId) }, { userId })

    return res.status(201).json({
      item: presentItem(item),
      remainingCredits: charged.credits,
      ...(pagesIndexed < numPages && {
        notice: `Your plan reads the first ${pagesIndexed} of ${numPages} pages. Upgrade to search the whole document.`,
      }),
    })
  } catch (err) {
    // Roll back the charge and any stored blob
    await User.updateOne({ _id: userId }, { $inc: { credits, storageBytes: -file.size } })
    await Item.deleteOne({ _id: itemId })
    await deleteFile(storageKey)
    console.error('[uploadPdf]', err.message)
    return res.status(500).json({ error: 'Upload failed. You were not charged.' })
  }
}

/** GET /api/items/:id/file — decrypt and stream the original PDF to its owner. */
export async function getItemFile(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null, type: 'pdf' })
    if (!item?.file?.storageKey) return res.status(404).json({ error: 'File not found' })
    const buffer = await getDecryptedFile({ userId: req.user.id, itemId: item._id, key: item.file.storageKey })

    const filename = (item.file.name || 'document.pdf').replace(/[^\w.\- ]+/g, '_')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('Content-Disposition', `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(item.file.name || 'document.pdf')}`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.send(buffer)
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid item id' })
    console.error('[getItemFile]', err.message)
    return res.status(500).json({ error: 'Could not open the file' })
  }
}

/** GET /api/items/:id/text — extracted text by page range, for the reader view. */
export async function getItemText(req, res) {
  try {
    const item = await Item.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: null }).select('userId type')
    if (!item) return res.status(404).json({ error: 'Item not found' })
    const chunks = await ItemChunk.find({ itemId: item._id, userId: req.user.id }).sort({ ordinal: 1 })
    return res.json({
      sections: chunks.map(c => ({ pageStart: c.pageStart, pageEnd: c.pageEnd, text: c.text })),
    })
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid item id' })
    return res.status(500).json({ error: 'Could not load text' })
  }
}

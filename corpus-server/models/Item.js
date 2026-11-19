import mongoose from 'mongoose'
import encryptedFieldsPlugin from './plugins/encryptedFields.js'

const itemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null, index: true },
    type: { type: String, enum: ['link', 'image', 'note', 'quote', 'pdf'], required: true },
    contentType: { type: String, default: '' },
    title: { type: String, trim: true },
    content: { type: String, trim: true },
    url: { type: String, trim: true },
    thumbnailUrl: { type: String },
    faviconUrl: { type: String },
    tags: [{ type: String, trim: true }],
    summary: { type: String, default: '' },
    note: { type: String, default: '' },
    archived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    status: { type: String, enum: ['ready', 'pending_ai'], default: 'ready' },
    // User switch: never send this item to any AI provider (no summary, tags or embeddings)
    aiOptOut: { type: Boolean, default: false },
    tldr: { type: String, default: '' }, // one sentence, ≤ 30 words (documents)
    keyPoints: [{ type: String }],
    docType: { type: String, default: '' }, // AI-detected document type, e.g. 'invoice', 'research-paper'
    // Uploaded documents (PDF)
    file: {
      name: String, // encrypted original filename
      storageKey: String, // opaque key of the encrypted blob
      sizeBytes: Number,
      pageCount: Number,
      pagesIndexed: Number,
      hashIndex: { type: String, select: false }, // blind index of the file's SHA-256 (duplicate detection)
      creditsCharged: Number,
    },
    // Live progress for long-running processing, shown on the card
    processing: {
      stage: { type: String, enum: ['queued', 'extracting', 'indexing', 'summarizing', 'done', 'failed'] },
      progress: Number, // 0–100
      note: String, // e.g. 'no_text' (scanned), 'truncated'
      error: String,
    },
    aiFailed: { type: Boolean, default: false }, // explicit failure flag, not inferred from timing
    embedding: { type: [Number], select: false }, // 768-dim vector for Atlas Vector Search
    // Blind indexes (keyed hashes) so we can filter by tag / dedupe URLs without storing plaintext
    tagIndex: { type: [String], select: false },
    urlHash: { type: String, select: false },
  },
  { timestamps: true }
)

// NOTE: no MongoDB $text index — user content is encrypted at rest, so keyword
// search runs in the app after decryption (see controllers/searchController.js).

itemSchema.index({ userId: 1, createdAt: -1 })
itemSchema.index({ userId: 1, contentType: 1 })
itemSchema.index({ userId: 1, tagIndex: 1 })
itemSchema.index({ userId: 1, urlHash: 1 })
itemSchema.index({ userId: 1, 'file.hashIndex': 1 }, { sparse: true })
itemSchema.index({ deletedAt: 1 }, { partialFilterExpression: { deletedAt: { $type: 'date' } } }) // trash purge

itemSchema.plugin(encryptedFieldsPlugin, {
  model: 'Item',
  fields: ['title', 'content', 'url', 'thumbnailUrl', 'faviconUrl', 'summary', 'tldr', 'note', 'file.name'],
  arrayFields: ['tags', 'keyPoints'],
  blindIndexes: {
    tagIndex: { from: 'tags', array: true },
    urlHash: { from: 'url' },
  },
})

export default mongoose.model('Item', itemSchema)

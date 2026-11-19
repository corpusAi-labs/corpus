import mongoose from 'mongoose'
import encryptedFieldsPlugin from './plugins/encryptedFields.js'

/**
 * A ~1,200-character slice of a document's text, so every page is searchable
 * (not just the first few KB of an item).
 *
 *   text       — encrypted with the owner's key
 *   tokenIndex — per-user HMACs of the words in `text`: an encrypted inverted
 *                index that MongoDB can match without seeing any word
 *   embedding  — 768-dim vector for semantic search (only if AI is allowed)
 */
const itemChunkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    ordinal: { type: Number, required: true },
    pageStart: Number,
    pageEnd: Number,
    pageOffsets: [Number], // where each later page starts inside `text` → exact page of a match
    text: { type: String, required: true },
    tokenIndex: { type: [String], select: false },
    embedding: { type: [Number], select: false },
  },
  { timestamps: true }
)

itemChunkSchema.index({ itemId: 1, ordinal: 1 }, { unique: true })
itemChunkSchema.index({ userId: 1, tokenIndex: 1 })

itemChunkSchema.plugin(encryptedFieldsPlugin, { model: 'ItemChunk', fields: ['text'] })

export default mongoose.model('ItemChunk', itemChunkSchema)

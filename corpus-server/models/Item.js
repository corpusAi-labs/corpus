import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null, index: true },
    type: { type: String, enum: ['link', 'image', 'note', 'quote'], required: true },
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
    aiFailed: { type: Boolean, default: false }, // explicit failure flag, not inferred from timing
    embedding: { type: [Number], select: false }, // 768-dim vector for Atlas Vector Search
  },
  { timestamps: true }
)

itemSchema.index({
  title: 'text', content: 'text', tags: 'text', summary: 'text', note: 'text', contentType: 'text', url: 'text',
}, {
  weights: { title: 10, tags: 8, summary: 6, content: 4, contentType: 4, note: 3, url: 2 },
  name: 'corpus_text_index',
})

itemSchema.index({ userId: 1, createdAt: -1 })
itemSchema.index({ userId: 1, contentType: 1 })

export default mongoose.model('Item', itemSchema)

import mongoose from 'mongoose'
import encryptedFieldsPlugin from './plugins/encryptedFields.js'

const spaceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    color: { type: String, default: '#2E5BFF' },
  },
  { timestamps: true }
)

spaceSchema.index({ userId: 1, createdAt: -1 })
spaceSchema.plugin(encryptedFieldsPlugin, { model: 'Space', fields: ['name'] })

export default mongoose.model('Space', spaceSchema)

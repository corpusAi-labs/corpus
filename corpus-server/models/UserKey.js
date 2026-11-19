import mongoose from 'mongoose'

/**
 * One wrapped data-encryption key (DEK) per user. The DEK itself is never
 * stored — only its ciphertext under the KEK. Deleting this document
 * crypto-shreds every encrypted field the user owns, including copies that
 * live on in database backups.
 */
const userKeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    provider: { type: String, required: true },
    kekId: { type: String, required: true, index: true },
    wrappedDek: { type: String, required: true },
    rotatedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('UserKey', userKeySchema)

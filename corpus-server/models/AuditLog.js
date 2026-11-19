import mongoose from 'mongoose'
import { getEnv } from '../config/env.js'

/**
 * Access log the user can read about their own account. Contains ids and
 * metadata only — never decrypted content. Expires automatically.
 */
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: { type: String, enum: ['user', 'system'], required: true },
  // 'data.access' for decrypt events, otherwise a security event e.g. 'auth.login'
  type: { type: String, required: true },
  action: { type: String, required: true }, // machine-readable, e.g. "GET /api/items/search"
  purpose: { type: String, default: '' }, // human-readable, e.g. "Searched your library"
  resources: [{ _id: false, model: String, ids: [mongoose.Schema.Types.ObjectId], count: Number }],
  requestId: String,
  ip: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
  // Identical reads within a short window are coalesced into one entry
  dedupeKey: { type: String, select: false },
  // No schema defaults here: they'd be injected into the upsert's $setOnInsert and
  // conflict with $inc/$set. Readers treat a missing `repeat` as 1.
  repeat: { type: Number },
  lastAt: { type: Date },
})

auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } })
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: getEnv().AUDIT_RETENTION_DAYS * 86400 })

export default mongoose.model('AuditLog', auditLogSchema)

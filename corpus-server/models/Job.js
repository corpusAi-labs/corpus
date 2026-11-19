import mongoose from 'mongoose'

/**
 * Durable background jobs. Survive restarts (unlike fire-and-forget promises),
 * retry with backoff, and recover from crashed workers via lease expiry.
 */
const jobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // ids only — never user content
    status: { type: String, enum: ['queued', 'running', 'done', 'failed'], default: 'queued' },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    runAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: '' },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

jobSchema.index({ status: 1, runAt: 1 })
jobSchema.index({ status: 1, lockedUntil: 1 })
// Keep finished jobs for a week for debugging, then let MongoDB delete them
jobSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 7 * 86400, partialFilterExpression: { finishedAt: { $type: 'date' } } })

export default mongoose.model('Job', jobSchema)

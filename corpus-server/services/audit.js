import crypto from 'crypto'
import AuditLog from '../models/AuditLog.js'
import { createContext, runWithContext, getContext } from './requestContext.js'

const MAX_IDS_PER_ENTRY = 100
const COALESCE_WINDOW_MS = 10 * 60 * 1000 // e.g. a card polling for progress = one entry, not hundreds

// Friendly labels shown to users in their access log
const PURPOSES = {
  'GET /api/items': 'Viewed your library',
  'GET /api/items/search': 'Searched your library',
  'GET /api/items/drift': 'Opened Drift',
  'GET /api/items/tags': 'Loaded your tags',
  'GET /api/items/:id': 'Opened an item',
  'POST /api/items': 'Saved a new item',
  'PATCH /api/items/:id': 'Edited an item',
  'DELETE /api/items/:id': 'Moved an item to trash',
  'POST /api/items/:id/retry-ai': 'Retried AI tagging',
  'GET /api/spaces': 'Viewed your spaces',
  'GET /api/spaces/:id': 'Opened a space',
  'POST /api/spaces': 'Created a space',
  'PATCH /api/spaces/:id': 'Renamed a space',
  'DELETE /api/spaces/:id': 'Deleted a space',
  'GET /api/account/export': 'Exported all your data',
  'POST /api/items/pdf': 'Uploaded a PDF',
  'GET /api/items/:id/file': 'Opened a PDF',
  'GET /api/items/:id/text': 'Opened reader view',
}

export const describe = action => PURPOSES[action] || action

/** Write one `data.access` entry per user touched in this context. */
export async function flushAccess(ctx) {
  if (!ctx || ctx.access.size === 0) return
  const docs = []
  for (const [userId, byModel] of ctx.access) {
    const resources = [...byModel].map(([model, ids]) => ({
      model,
      count: ids.size,
      ids: [...ids].slice(0, MAX_IDS_PER_ENTRY),
    }))
    docs.push({
      userId,
      actor: ctx.actor,
      type: 'data.access',
      action: ctx.action || 'unknown',
      purpose: ctx.purpose || describe(ctx.action),
      resources,
      requestId: ctx.requestId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    })
  }
  ctx.access.clear()
  const now = new Date()
  for (const doc of docs) {
    // Same reader + action + records within the same time bucket → one entry.
    // Atomic upsert on a unique key, so concurrent requests can't double-insert.
    const ids = doc.resources.flatMap(r => r.ids.map(id => `${r.model}:${id}`)).sort()
    const bucket = Math.floor(now.getTime() / COALESCE_WINDOW_MS)
    const dedupeKey = crypto.createHash('sha1').update([doc.userId, doc.actor, doc.action, bucket, ...ids].join('|')).digest('hex')
    const upsert = () => AuditLog.updateOne(
      { dedupeKey },
      { $setOnInsert: { ...doc, createdAt: now }, $inc: { repeat: 1 }, $set: { lastAt: now } },
      { upsert: true }
    )
    try {
      await upsert().catch(err => (err.code === 11000 ? upsert() : Promise.reject(err))) // lost the insert race → update
    } catch (err) {
      console.error('[audit] failed to write access log:', err.message)
    }
  }
}

/** Record a security event (login, logout, token reuse, export, …). */
export async function auditEvent(userId, type, purpose, req) {
  const ctx = getContext()
  try {
    await AuditLog.create({
      userId,
      actor: 'user',
      type,
      action: type,
      purpose,
      requestId: ctx?.requestId,
      ip: req?.ip ?? ctx?.ip,
      userAgent: req?.get?.('user-agent') ?? ctx?.userAgent,
    })
  } catch (err) {
    console.error('[audit] failed to write event:', err.message)
  }
}

/**
 * Run background work (AI tagging, embeddings, purge) under a `system` actor
 * so its decrypts show up in the user's log with an honest purpose.
 */
export async function runAsSystem(purpose, fn) {
  const ctx = createContext({ actor: 'system', action: `system:${purpose}`, purpose })
  return runWithContext(ctx, async () => {
    try {
      return await fn()
    } finally {
      await flushAccess(ctx)
    }
  })
}

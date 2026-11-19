import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'

/**
 * Per-request (or per-background-job) context carried through every await via
 * AsyncLocalStorage. The encryption layer records which documents it
 * decrypted here; the audit service flushes it as one log entry at the end.
 */
const als = new AsyncLocalStorage()

export const getContext = () => als.getStore()

export function createContext(fields = {}) {
  return {
    requestId: randomUUID(),
    actor: 'user',
    purpose: '',
    ip: undefined,
    userAgent: undefined,
    access: new Map(), // userId -> Map<model, Set<docId>>
    ...fields,
  }
}

export const runWithContext = (ctx, fn) => als.run(ctx, fn)

/** Called by the encryption plugin each time it decrypts a document. */
export function recordAccess(model, userId, docId) {
  const ctx = als.getStore()
  if (!ctx || !userId || !docId) return
  const uid = String(userId)
  if (!ctx.access.has(uid)) ctx.access.set(uid, new Map())
  const byModel = ctx.access.get(uid)
  if (!byModel.has(model)) byModel.set(model, new Set())
  byModel.get(model).add(String(docId))
}

import crypto from 'crypto'
import mongoose from 'mongoose'
import UserKey from '../../models/UserKey.js'
import { getEnv } from '../../config/env.js'
import { getKeyProvider } from './index.js'

/**
 * Per-user data-encryption keys (envelope encryption).
 *
 *   KEK (env or Cloud KMS) ──wraps──▶ DEK (one per user, stored wrapped in `userkeys`)
 *   DEK ──HKDF──▶ field-encryption key + blind-index key
 *
 * Unwrapped DEKs are cached in process memory for a short TTL so a page of
 * results costs one unwrap, not one per document.
 */
const MAX_CACHE_ENTRIES = 5000
const cache = new Map() // userId -> { keys, expiresAt }
const inflight = new Map() // userId -> Promise<keys>

function deriveKeys(dek) {
  const derive = info => Buffer.from(crypto.hkdfSync('sha256', dek, Buffer.alloc(0), info, 32))
  return { enc: derive('corpus:field-encryption:v2'), index: derive('corpus:blind-index:v2') }
}

function cacheSet(userId, keys) {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value) // evict oldest
  cache.set(userId, { keys, expiresAt: Date.now() + getEnv().DEK_CACHE_TTL_SECONDS * 1000 })
}

async function loadOrCreate(userId) {
  const provider = await getKeyProvider()
  let record = await UserKey.findOne({ userId }).lean()

  if (!record) {
    const dek = crypto.randomBytes(32)
    const { kekId, wrapped } = await provider.wrap(dek)
    try {
      await UserKey.create({ userId, provider: provider.name, kekId, wrappedDek: wrapped })
      return deriveKeys(dek)
    } catch (err) {
      if (err.code !== 11000) throw err
      record = await UserKey.findOne({ userId }).lean() // lost a creation race — use the winner's key
    }
  }

  const dek = await provider.unwrap({ kekId: record.kekId, wrapped: record.wrappedDek })
  return deriveKeys(dek)
}

/** Returns { enc, index } keys for a user, creating the user's DEK on first use. */
export async function getUserKeys(userId) {
  if (!userId) throw new Error('[keys] userId is required for encryption')
  const id = String(userId instanceof mongoose.Types.ObjectId ? userId.toHexString() : userId)

  const hit = cache.get(id)
  if (hit && hit.expiresAt > Date.now()) return hit.keys

  if (!inflight.has(id)) {
    inflight.set(id, loadOrCreate(id)
      .then(keys => { cacheSet(id, keys); return keys })
      .finally(() => inflight.delete(id)))
  }
  return inflight.get(id)
}

/**
 * Crypto-shred: destroy the user's DEK. All of their ciphertext — in the live
 * database and in every backup — becomes permanently unreadable.
 */
export async function shredUserKey(userId) {
  const id = String(userId)
  cache.delete(id)
  await UserKey.deleteOne({ userId: id })
}

/** Re-wrap every DEK not under the current KEK. Data itself is untouched. */
export async function rewrapAllKeys({ dryRun = false, log = console.log } = {}) {
  const provider = await getKeyProvider()
  const stale = await UserKey.find({ kekId: { $ne: provider.currentKekId } })
  log(`[keys] ${stale.length} DEK(s) wrapped under an old KEK`)
  if (dryRun) return stale.length

  for (const rec of stale) {
    const dek = await provider.unwrap({ kekId: rec.kekId, wrapped: rec.wrappedDek })
    const { kekId, wrapped } = await provider.wrap(dek)
    await UserKey.updateOne({ _id: rec._id }, { kekId, wrappedDek: wrapped, provider: provider.name, rotatedAt: new Date() })
  }
  cache.clear()
  return stale.length
}

export function clearKeyCache() {
  cache.clear()
}

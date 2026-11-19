import crypto from 'crypto'
import { getEnv } from '../config/env.js'
import { getKeyProvider } from './keys/index.js'
import { getUserKeys } from './keys/keyService.js'

/**
 * Field-level encryption for user content.
 *
 * v2 (current):  enc:v2:<iv>:<tag>:<ciphertext>   (base64 parts)
 *   - AES-256-GCM with the owning user's DEK-derived key
 *   - AAD = "corpus|<userId>|<context>" (e.g. "Item.title"), so a ciphertext
 *     copied into another user's document or another field fails to decrypt.
 *
 * v1 (legacy):   enc:v1:...  single global key — still readable so that
 *   `npm run encrypt:migrate` can upgrade old rows. Never written anymore.
 *
 * Anything without a prefix is legacy plaintext and is passed through.
 */
const V2 = 'enc:v2:'
const FILE_MAGIC = Buffer.from('CRP1')
const V1 = 'enc:v1:'

export function isEncrypted(value) {
  return typeof value === 'string' && (value.startsWith(V2) || value.startsWith(V1))
}

export function isCurrentFormat(value) {
  return typeof value === 'string' && value.startsWith(V2)
}

const aad = (userId, context) => Buffer.from(`corpus|${String(userId)}|${context}`)

// ── legacy v1 ──
let legacyKey
function legacyV1Key() {
  if (legacyKey !== undefined) return legacyKey
  const raw = getEnv().DATA_ENCRYPTION_KEY
  legacyKey = raw
    ? Buffer.from(crypto.hkdfSync('sha256', Buffer.from(raw, 'base64'), Buffer.alloc(0), 'corpus:field-encryption:v1', 32))
    : null
  return legacyKey
}

function decryptV1(value) {
  const key = legacyV1Key()
  if (!key) throw new Error('legacy v1 data needs DATA_ENCRYPTION_KEY')
  const [iv, tag, data] = value.slice(V1.length).split(':')
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
}

/**
 * A per-user cipher bound to that user's keys. Obtain once per user per
 * operation; all methods are synchronous after that.
 */
export async function getUserCipher(userId) {
  const keys = await getUserKeys(userId)

  return {
    encrypt(value, context) {
      if (value === null || value === undefined || value === '') return value
      if (isCurrentFormat(value)) return value
      const plain = isEncrypted(value) ? this.decrypt(value, context) : String(value)
      const iv = crypto.randomBytes(12)
      const c = crypto.createCipheriv('aes-256-gcm', keys.enc, iv)
      c.setAAD(aad(userId, context))
      const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()])
      return `${V2}${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${ct.toString('base64')}`
    },

    decrypt(value, context) {
      if (!isEncrypted(value)) return value
      try {
        if (value.startsWith(V1)) return decryptV1(value)
        const [iv, tag, data] = value.slice(V2.length).split(':')
        const d = crypto.createDecipheriv('aes-256-gcm', keys.enc, Buffer.from(iv, 'base64'))
        d.setAAD(aad(userId, context))
        d.setAuthTag(Buffer.from(tag, 'base64'))
        return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8')
      } catch (err) {
        // Tampered, moved between users/fields, or key destroyed — never leak ciphertext
        console.error(`[crypto] decrypt failed for ${context}:`, err.message)
        return ''
      }
    },

    /** Binary envelope for files: "CRP1" | iv(12) | tag(16) | ciphertext. Throws on failure. */
    encryptBytes(buffer, context) {
      const iv = crypto.randomBytes(12)
      const c = crypto.createCipheriv('aes-256-gcm', keys.enc, iv)
      c.setAAD(aad(userId, context))
      const ct = Buffer.concat([c.update(buffer), c.final()])
      return Buffer.concat([FILE_MAGIC, iv, c.getAuthTag(), ct])
    },

    decryptBytes(blob, context) {
      if (!blob.subarray(0, 4).equals(FILE_MAGIC)) throw new Error('[crypto] not an encrypted file blob')
      const d = crypto.createDecipheriv('aes-256-gcm', keys.enc, blob.subarray(4, 16))
      d.setAAD(aad(userId, context))
      d.setAuthTag(blob.subarray(16, 32))
      return Buffer.concat([d.update(blob.subarray(32)), d.final()])
    },

    /** Deterministic keyed hash for exact-match lookups (tags, URL dedupe). */
    blindIndex(value, context) {
      if (value === null || value === undefined || value === '') return null
      return crypto.createHmac('sha256', keys.index).update(`${context}\u0000${String(value)}`).digest('base64')
    },
  }
}

/** Convenience for query building in controllers. */
export async function blindIndexFor(userId, value, context) {
  return (await getUserCipher(userId)).blindIndex(value, context)
}

/** Validate config and reach the KEK provider at boot (fail fast). */
export async function assertEncryptionConfigured() {
  getEnv()
  await getKeyProvider()
}

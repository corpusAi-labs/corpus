import crypto from 'crypto'
import { getEnv, csv } from '../../config/env.js'

/**
 * Local KEK provider: the key-encryption key comes from the environment.
 *
 * Wrap = AES-256-GCM(kek, dek). The KEK id is a fingerprint of the key, so
 * every wrapped DEK records exactly which KEK can unwrap it. To rotate:
 *   1. move the current DATA_ENCRYPTION_KEY into DATA_ENCRYPTION_KEYS_RETIRED
 *   2. set a new DATA_ENCRYPTION_KEY
 *   3. run `npm run keys:rotate` (re-wraps every DEK; data is NOT re-encrypted)
 *   4. drop the retired key once the script reports 0 remaining
 */
function deriveWrapKey(masterB64) {
  const master = Buffer.from(masterB64, 'base64')
  return Buffer.from(crypto.hkdfSync('sha256', master, Buffer.alloc(0), 'corpus:kek-wrap:v1', 32))
}

function fingerprint(masterB64) {
  return 'local:' + crypto.createHash('sha256').update(Buffer.from(masterB64, 'base64')).digest('hex').slice(0, 16)
}

export function createLocalProvider() {
  const env = getEnv()
  const ring = new Map()
  const current = { id: fingerprint(env.DATA_ENCRYPTION_KEY), key: deriveWrapKey(env.DATA_ENCRYPTION_KEY) }
  ring.set(current.id, current.key)
  for (const old of csv(env.DATA_ENCRYPTION_KEYS_RETIRED)) {
    ring.set(fingerprint(old), deriveWrapKey(old))
  }

  return {
    name: 'local',
    currentKekId: current.id,

    async wrap(dek) {
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', current.key, iv)
      cipher.setAAD(Buffer.from(current.id))
      const ct = Buffer.concat([cipher.update(dek), cipher.final()])
      return {
        kekId: current.id,
        wrapped: Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64'),
      }
    },

    async unwrap({ kekId, wrapped }) {
      const key = ring.get(kekId)
      if (!key) throw new Error(`[keys] KEK ${kekId} is not available (retired key missing from env?)`)
      const buf = Buffer.from(wrapped, 'base64')
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12))
      decipher.setAAD(Buffer.from(kekId))
      decipher.setAuthTag(buf.subarray(12, 28))
      return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()])
    },
  }
}

import Redis from 'ioredis'
import { getEnv } from '../config/env.js'

/**
 * Redis access for short-lived, shared state:
 *   rate-limit counters · login lockouts · OTPs · access-token revocation
 *
 * Everything here is ephemeral by design (TTL'd) and safe to lose; durable
 * data stays in MongoDB. Unwrapped encryption keys are NEVER stored here —
 * they live only in each process's memory.
 *
 * Without REDIS_URL (dev, tests) an in-memory store with the same interface
 * is used, so the app behaves identically on a single instance.
 */
let client = null
let kv = null

export function getRedisClient() {
  const { REDIS_URL } = getEnv()
  if (!REDIS_URL) return null
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1, // fail fast instead of hanging requests
      connectTimeout: 3000,
      enableAutoPipelining: true,
      retryStrategy: times => Math.min(times * 500, 5000),
    })
    client.on('error', err => console.error('[redis]', err.message))
    client.on('ready', () => console.log('[redis] connected'))
  }
  return client
}

// Atomically increment and set the expiry on first increment
const INCR_WITH_TTL = `
local v = redis.call('INCR', KEYS[1])
if v == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return v`

function redisKv(redis, prefix) {
  const k = key => prefix + key
  return {
    backend: 'redis',
    get: key => redis.get(k(key)),
    mget: keys => (keys.length ? redis.mget(keys.map(k)) : []),
    set: (key, value, ttlMs) => redis.set(k(key), value, 'PX', ttlMs),
    del: (...keys) => redis.del(...keys.map(k)),
    incr: (key, ttlMs) => redis.eval(INCR_WITH_TTL, 1, k(key), ttlMs).then(Number),
    pttl: key => redis.pttl(k(key)),
    status: () => redis.status, // 'ready' when healthy
  }
}

function memoryKv() {
  const store = new Map() // key -> { value, expiresAt }
  const live = key => {
    const e = store.get(key)
    if (!e) return null
    if (e.expiresAt <= Date.now()) { store.delete(key); return null }
    return e
  }
  return {
    backend: 'memory',
    get: async key => live(key)?.value ?? null,
    mget: async keys => keys.map(key => live(key)?.value ?? null),
    set: async (key, value, ttlMs) => { store.set(key, { value: String(value), expiresAt: Date.now() + ttlMs }) },
    del: async (...keys) => keys.forEach(key => store.delete(key)),
    incr: async (key, ttlMs) => {
      const e = live(key)
      const value = (e ? Number(e.value) : 0) + 1
      store.set(key, { value: String(value), expiresAt: e ? e.expiresAt : Date.now() + ttlMs })
      return value
    },
    pttl: async key => { const e = live(key); return e ? e.expiresAt - Date.now() : -2 },
    status: () => 'ready',
  }
}

/** Shared key-value store (Redis if configured, else in-memory). */
export function getKv() {
  if (!kv) {
    const redis = getRedisClient()
    kv = redis ? redisKv(redis, getEnv().REDIS_KEY_PREFIX) : memoryKv()
  }
  return kv
}

export function kvHealth() {
  const store = getKv()
  return { backend: store.backend, status: store.status() }
}

export async function closeRedis() {
  if (client) await client.quit().catch(() => {})
  client = null
  kv = null
}

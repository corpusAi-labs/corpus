/**
 * Test harness. Integration tests run against a real MongoDB:
 *
 *   TEST_MONGO_URI=mongodb://127.0.0.1:27017 npm test
 *
 * Each test file gets its own throwaway database. Without TEST_MONGO_URI the
 * DB-backed suites are skipped (pure unit tests still run).
 */
import crypto from 'crypto'

export const TEST_MONGO_URI = process.env.TEST_MONGO_URI
export const skipNoDb = TEST_MONGO_URI ? false : 'set TEST_MONGO_URI to run DB-backed tests'

export const TEST_KEK = crypto.createHash('sha256').update('corpus-test-kek').digest('base64')

/** Must run before importing any app module (config is read at import time). */
export const TEST_REDIS_URL = process.env.TEST_REDIS_URL

export function setupEnv(dbName, overrides = {}) {
  if (TEST_REDIS_URL) {
    process.env.REDIS_URL = TEST_REDIS_URL
    process.env.REDIS_KEY_PREFIX = `corpus-test:${dbName}:${crypto.randomBytes(4).toString('hex')}:`
  } else {
    delete process.env.REDIS_URL
  }
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGO_URI: TEST_MONGO_URI ? `${TEST_MONGO_URI.replace(/\/$/, '')}/${dbName}` : 'mongodb://unused',
    ACCESS_SECRET: 'test-access-secret-0123456789abcdef0123',
    REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef012',
    KEY_PROVIDER: 'local',
    DATA_ENCRYPTION_KEY: TEST_KEK,
    GROQ_API_KEY: '',
    GEMINI_API_KEY: '',
    CLOUDINARY_CLOUD_NAME: '',
    ...overrides,
  })
}

export async function connectFresh() {
  const mongoose = (await import('mongoose')).default
  await mongoose.connect(process.env.MONGO_URI)
  await mongoose.connection.db.dropDatabase()
  return mongoose
}

/** Minimal HTTP client with a cookie jar, against an ephemeral server. */
export async function startServer() {
  const { createApp } = await import('../app.js')
  const server = createApp().listen(0)
  await new Promise(r => server.once('listening', r))
  const base = `http://127.0.0.1:${server.address().port}/api`

  const client = (jar = new Map()) => {
    const request = async (method, path, body, headers = {}) => {
      const res = await fetch(base + path, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(';')
        const [k, ...v] = pair.split('=')
        const value = v.join('=')
        if (value) jar.set(k, value)
        else jar.delete(k)
      }
      const text = await res.text()
      let json
      try { json = JSON.parse(text) } catch { json = undefined }
      return { status: res.status, body: json, text, headers: res.headers }
    }
    const upload = async (path, form) => {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {},
        body: form,
      })
      const text = await res.text()
      let json
      try { json = JSON.parse(text) } catch { json = undefined }
      return { status: res.status, body: json, text }
    }
    const getBytes = async path => {
      const res = await fetch(base + path, { headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } })
      return { status: res.status, headers: res.headers, bytes: Buffer.from(await res.arrayBuffer()) }
    }
    return {
      jar,
      upload,
      getBytes,
      get: (p, h) => request('GET', p, undefined, h),
      post: (p, b = {}, h) => request('POST', p, b, h),
      patch: (p, b = {}, h) => request('PATCH', p, b, h),
      del: (p, b, h) => request('DELETE', p, b, h),
    }
  }

  return {
    base,
    client,
    close: () => new Promise(r => { server.close(r); server.closeAllConnections() }),
  }
}

export const wait = ms => new Promise(r => setTimeout(r, ms))

/** Close shared connections so the test process can exit. */
export async function teardown(mongoose) {
  await (await import('../services/redis.js')).closeRedis()
  if (mongoose) await mongoose.disconnect()
}

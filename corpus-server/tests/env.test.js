import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setupEnv } from './helpers.js'

setupEnv('unused')
const { getEnv, resetEnvCache } = await import('../config/env.js')

const withEnv = (patch, fn) => {
  const saved = { ...process.env }
  Object.assign(process.env, patch)
  for (const [k, v] of Object.entries(patch)) if (v === undefined) delete process.env[k]
  resetEnvCache()
  try { return fn() } finally { process.env = saved; resetEnvCache() }
}

test('rejects a missing encryption key', () => {
  withEnv({ DATA_ENCRYPTION_KEY: undefined }, () => assert.throws(getEnv, /DATA_ENCRYPTION_KEY/))
})

test('rejects a malformed encryption key', () => {
  withEnv({ DATA_ENCRYPTION_KEY: 'too-short' }, () => assert.throws(getEnv, /32 bytes/))
})

test('rejects weak JWT secrets in production only', () => {
  withEnv({ NODE_ENV: 'production', ACCESS_SECRET: 'short' }, () => assert.throws(getEnv, /ACCESS_SECRET/))
  withEnv({ NODE_ENV: 'development', ACCESS_SECRET: 'short' }, () => assert.doesNotThrow(getEnv))
})

test('gcp-kms provider requires a key name', () => {
  withEnv({ KEY_PROVIDER: 'gcp-kms', GCP_KMS_KEY_NAME: undefined }, () => assert.throws(getEnv, /GCP_KMS_KEY_NAME/))
})

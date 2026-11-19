import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import { setupEnv, connectFresh, skipNoDb, TEST_KEK } from './helpers.js'

setupEnv('corpus_test_crypto')

describe('field encryption (envelope, per-user)', { skip: skipNoDb }, () => {
  let mongoose, c, keys, env, provider
  const alice = '64b000000000000000000001'
  const bob = '64b000000000000000000002'

  before(async () => {
    mongoose = await connectFresh()
    c = await import('../services/crypto.js')
    keys = await import('../services/keys/keyService.js')
    env = await import('../config/env.js')
    provider = await import('../services/keys/index.js')
  })
  after(() => mongoose.disconnect())

  test('round-trips and produces non-deterministic ciphertext', async () => {
    const a = await c.getUserCipher(alice)
    const x = a.encrypt('my private note', 'Item.note')
    const y = a.encrypt('my private note', 'Item.note')
    assert.match(x, /^enc:v2:/)
    assert.notEqual(x, y, 'random IV per value')
    assert.equal(a.decrypt(x, 'Item.note'), 'my private note')
  })

  test('ciphertext is bound to its owner and field (AAD)', async () => {
    const a = await c.getUserCipher(alice)
    const b = await c.getUserCipher(bob)
    const ct = a.encrypt('secret', 'Item.title')
    assert.equal(b.decrypt(ct, 'Item.title'), '', 'another user cannot decrypt')
    assert.equal(a.decrypt(ct, 'Item.note'), '', 'cannot be moved to another field')
  })

  test('tampering is detected', async () => {
    const a = await c.getUserCipher(alice)
    const ct = a.encrypt('secret', 'Item.title')
    const bad = ct.slice(0, -4) + (ct.endsWith('AAAA') ? 'BBBB' : 'AAAA')
    assert.equal(a.decrypt(bad, 'Item.title'), '')
  })

  test('blind indexes are deterministic per user, unlinkable across users', async () => {
    const a = await c.getUserCipher(alice)
    const b = await c.getUserCipher(bob)
    assert.equal(a.blindIndex('physics', 'Item.tags'), a.blindIndex('physics', 'Item.tags'))
    assert.notEqual(a.blindIndex('physics', 'Item.tags'), b.blindIndex('physics', 'Item.tags'))
  })

  test('wrapped DEK is stored, raw DEK is not', async () => {
    const rec = await mongoose.connection.db.collection('userkeys').findOne({ userId: new mongoose.Types.ObjectId(alice) })
    assert.ok(rec.wrappedDek && rec.kekId.startsWith('local:'))
    assert.equal(Buffer.from(rec.wrappedDek, 'base64').length, 12 + 16 + 32, 'iv + tag + 32-byte DEK ciphertext')
  })

  test('legacy v1 ciphertext is still readable (for migration)', async () => {
    const k = Buffer.from(crypto.hkdfSync('sha256', Buffer.from(TEST_KEK, 'base64'), Buffer.alloc(0), 'corpus:field-encryption:v1', 32))
    const iv = crypto.randomBytes(12)
    const ci = crypto.createCipheriv('aes-256-gcm', k, iv)
    const ct = Buffer.concat([ci.update('old data'), ci.final()])
    const v1 = `enc:v1:${iv.toString('base64')}:${ci.getAuthTag().toString('base64')}:${ct.toString('base64')}`
    const a = await c.getUserCipher(alice)
    assert.equal(a.decrypt(v1, 'Item.title'), 'old data')
    assert.match(a.encrypt(v1, 'Item.title'), /^enc:v2:/, 'encrypt() upgrades v1 to v2')
  })

  test('KEK rotation re-wraps DEKs and data stays readable', async () => {
    const before = await c.getUserCipher(alice)
    const ct = before.encrypt('survives rotation', 'Item.content')

    const newKek = crypto.randomBytes(32).toString('base64')
    process.env.DATA_ENCRYPTION_KEYS_RETIRED = TEST_KEK
    process.env.DATA_ENCRYPTION_KEY = newKek
    env.resetEnvCache(); provider.resetKeyProvider(); keys.clearKeyCache()

    const n = await keys.rewrapAllKeys({ log: () => {} })
    assert.ok(n >= 2)
    const p = await provider.getKeyProvider()
    const stale = await mongoose.connection.db.collection('userkeys').countDocuments({ kekId: { $ne: p.currentKekId } })
    assert.equal(stale, 0)

    // retire the old KEK completely
    delete process.env.DATA_ENCRYPTION_KEYS_RETIRED
    env.resetEnvCache(); provider.resetKeyProvider(); keys.clearKeyCache()
    assert.equal((await c.getUserCipher(alice)).decrypt(ct, 'Item.content'), 'survives rotation')
  })

  test('crypto-shredding makes data permanently unreadable', async () => {
    const a = await c.getUserCipher(alice)
    const ct = a.encrypt('to be forgotten', 'Item.content')
    await keys.shredUserKey(alice)
    const fresh = await c.getUserCipher(alice) // a brand-new DEK
    assert.equal(fresh.decrypt(ct, 'Item.content'), '')
  })
})

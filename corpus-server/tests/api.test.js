import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setupEnv, connectFresh, startServer, skipNoDb, wait, teardown } from './helpers.js'

setupEnv('corpus_test_api')

describe('API: encryption at rest, access log, auth hardening, deletion', { skip: skipNoDb }, () => {
  let mongoose, srv, db, User, bcrypt, hashOtp
  let alice, bob

  const signIn = async (email, password = 'correct horse battery') => {
    const c = srv.client()
    const r = await c.post('/auth/login', { email, password })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    return c
  }

  before(async () => {
    mongoose = await connectFresh()
    db = mongoose.connection.db
    User = (await import('../models/User.js')).default
    bcrypt = (await import('bcryptjs')).default
    ;({ hashOtp } = await import('../services/authTokens.js'))
    await (await import('../models/Item.js')).default.init()
    srv = await startServer()

    const passwordHash = await bcrypt.hash('correct horse battery', 4)
    await User.create({ email: 'alice@test.dev', name: 'Alice', passwordHash, credits: 50 })
    await User.create({ email: 'bob@test.dev', name: 'Bob', passwordHash, credits: 50 })
    alice = await signIn('alice@test.dev')
    bob = await signIn('bob@test.dev')
  })
  after(async () => {
    await srv.close()
    await teardown(mongoose)
  })

  let noteId

  test('content is stored as ciphertext, returned as plaintext', async () => {
    const r = await alice.post('/items', { type: 'note', title: 'Diary', content: 'quantum entanglement secrets' })
    assert.equal(r.status, 201)
    assert.equal(r.body.item.content, 'quantum entanglement secrets')
    assert.equal(r.body.item.tagIndex, undefined, 'internal fields are not exposed')
    noteId = r.body.item._id

    await wait(300) // background AI job (no key in tests) settles
    const raw = await db.collection('items').findOne({ _id: new mongoose.Types.ObjectId(noteId) })
    assert.match(raw.title, /^enc:v2:/)
    assert.match(raw.content, /^enc:v2:/)
    assert.ok(!JSON.stringify(raw).includes('quantum'), 'no plaintext anywhere in the stored document')
  })

  test('tags: encrypted, filterable via blind index, listable', async () => {
    const u = await alice.patch(`/items/${noteId}`, { tags: ['physics', 'private'], note: 'remember' })
    assert.equal(u.status, 200)
    assert.deepEqual(u.body.item.tags, ['physics', 'private'])

    const raw = await db.collection('items').findOne({ _id: new mongoose.Types.ObjectId(noteId) })
    assert.ok(raw.tags.every(t => t.startsWith('enc:v2:')))
    assert.equal(raw.tagIndex.length, 2)

    assert.equal((await alice.get('/items?tag=physics')).body.items.length, 1)
    assert.equal((await alice.get('/items?tag=nope')).body.items.length, 0)
    assert.deepEqual((await alice.get('/items/tags')).body.tags, ['physics', 'private'])
  })

  test('rejects malformed updates', async () => {
    assert.equal((await alice.patch(`/items/${noteId}`, { tags: 'not-an-array' })).status, 400)
    assert.equal((await alice.patch(`/items/${noteId}`, { title: { $gt: '' } })).status, 400)
  })

  test('keyword search works over encrypted content', async () => {
    assert.equal((await alice.get('/items/search?q=quantum')).body.items.length, 1)
    assert.equal((await alice.get('/items/search?q=' + encodeURIComponent('a-b (weird'))).status, 200)
  })

  test('users are isolated', async () => {
    assert.equal((await bob.get(`/items/${noteId}`)).status, 404)
    assert.equal((await bob.get('/items/search?q=quantum')).body.items.length, 0)
  })

  test('cannot attach another user\'s private media', async () => {
    const aliceId = (await User.findOne({ email: 'alice@test.dev' }))._id
    const r = await bob.post('/items', { type: 'image', thumbnailUrl: `cld:authenticated/image/corpus/u/${aliceId}/x.png` })
    assert.equal(r.status, 400)
    const js = await bob.post('/items', { type: 'image', thumbnailUrl: 'javascript:alert(1)' })
    assert.equal(js.status, 400)
  })

  test('spaces are encrypted', async () => {
    const r = await alice.post('/spaces', { name: 'Taxes 2026' })
    assert.equal(r.body.space.name, 'Taxes 2026')
    const raw = await db.collection('spaces').findOne({})
    assert.match(raw.name, /^enc:v2:/)
    assert.equal((await alice.get('/spaces')).body.spaces[0].name, 'Taxes 2026')
  })

  test('access log records user and system decrypts, without content', async () => {
    await alice.get('/items')
    // The background AI job flushes its entry when it finishes (it retries the
    // embedding call with backoff when no key is configured), so poll briefly.
    let log
    for (let i = 0; i < 50; i++) {
      log = await alice.get('/account/access-log')
      if (log.body.entries.some(e => e.actor === 'system')) break
      await wait(100)
    }
    assert.equal(log.status, 200)
    const purposes = log.body.entries.map(e => e.purpose)
    assert.ok(purposes.includes('Viewed your library'), purposes.join(' | '))
    assert.ok(purposes.includes('Searched your library'))
    assert.ok(log.body.entries.some(e => e.actor === 'system' && e.purpose === 'AI tagging & summary'), JSON.stringify(log.body.entries.map(e => [e.actor, e.purpose])))
    assert.ok(purposes.includes('Signed in with password'))
    assert.ok(!JSON.stringify(log.body).includes('quantum'))

    const bobLog = await bob.get('/account/access-log')
    assert.ok(!bobLog.body.entries.some(e => e.purpose === 'Viewed your library'), "bob doesn't see alice's log")

    const csv = await alice.get('/account/access-log/download')
    assert.match(csv.headers.get('content-type'), /text\/csv/)
    assert.match(csv.text, /^time,last_time,times,actor,type,purpose/)
  })

  test('data export returns decrypted data', async () => {
    const r = await alice.get('/account/export')
    assert.equal(r.status, 200)
    assert.equal(r.body.format, 'corpus-export/v1')
    assert.ok(r.body.items.some(i => i.content === 'quantum entanglement secrets'))
  })

  test('refresh tokens: stored hashed, rotated, replay revokes all sessions', async () => {
    const c = await signIn('bob@test.dev')
    const stolen = c.jar.get('refreshToken')

    const user = await User.findOne({ email: 'bob@test.dev' })
    assert.ok(!user.refreshTokens.includes(stolen), 'raw token is never stored')

    const r1 = await c.post('/auth/refresh')
    assert.equal(r1.status, 200)
    assert.notEqual(c.jar.get('refreshToken'), stolen, 'rotated')

    // Within the grace window a concurrent tab may still present the old token
    const tab2 = srv.client(new Map([['refreshToken', stolen]]))
    assert.equal((await tab2.post('/auth/refresh')).status, 200)

    // After the grace window, a replay means theft → every session revoked
    await User.updateOne({ _id: user._id }, { $set: { 'rotatedTokens.$[].at': new Date(Date.now() - 60_000) } })
    const attacker = srv.client(new Map([['refreshToken', stolen]]))
    assert.equal((await attacker.post('/auth/refresh')).status, 401)
    assert.equal((await User.findById(user._id)).refreshTokens.length, 0)
    assert.equal((await c.post('/auth/refresh')).status, 401, 'legit session was revoked too')
  })

  test('OTP: stored as HMAC, burned after 5 wrong attempts', async () => {
    const otpStore = await import('../services/otpStore.js')
    const email = 'alice@test.dev'
    await otpStore.saveOtp(email, { otpHash: hashOtp(email, '123456'), name: 'Alice', passwordHash: 'x' })
    const c = srv.client()
    for (let i = 0; i < 5; i++) {
      const r = await c.post('/auth/confirm-password-setup', { email, otp: '000000', password: 'newpassword1' })
      assert.equal(r.status, 400)
    }
    const r = await c.post('/auth/confirm-password-setup', { email, otp: '123456', password: 'newpassword1' })
    assert.equal(r.status, 429, 'even the correct code is rejected once burned')
    assert.equal(await otpStore.getOtp(email), null, 'burned code is deleted')
  })

  test('logout revokes the access token immediately (not in 15 minutes)', async () => {
    const c = await signIn('bob@test.dev')
    const stolenAccess = c.jar.get('accessToken')
    assert.equal((await c.get('/items')).status, 200)
    await c.post('/auth/logout')
    const replay = srv.client(new Map([['accessToken', stolenAccess]]))
    assert.equal((await replay.get('/items')).status, 401)
  })

  test('sign out everywhere kills access tokens on other devices immediately', async () => {
    const phone = await signIn('bob@test.dev')
    const laptop = await signIn('bob@test.dev')
    assert.equal((await phone.get('/items')).status, 200)
    assert.equal((await laptop.post('/account/sign-out-everywhere')).status, 200)
    assert.equal((await phone.get('/items')).status, 401, 'phone is signed out without waiting for expiry')
    assert.equal((await signIn('bob@test.dev').then(c => c.get('/items'))).status, 200, 'a fresh sign-in works')
  })

  test('per-account lockout after 5 wrong passwords, without revealing if the account exists', async () => {
    const bcryptLocal = (await import('bcryptjs')).default
    await User.create({ email: 'carol@test.dev', passwordHash: await bcryptLocal.hash('carol-right-pass', 4) })
    const attempt = (email, password) => srv.client().post('/auth/login', { email, password }, { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` })
    for (let i = 0; i < 4; i++) assert.equal((await attempt('carol@test.dev', 'wrong')).status, 401)
    const fifth = await attempt('carol@test.dev', 'wrong')
    assert.equal(fifth.status, 429)
    assert.equal(fifth.body.code, 'ACCOUNT_LOCKED')
    assert.equal((await attempt('carol@test.dev', 'carol-right-pass')).status, 429, 'even the right password is refused while locked')

    for (let i = 0; i < 4; i++) await attempt('ghost@test.dev', 'x')
    assert.equal((await attempt('ghost@test.dev', 'x')).body.code, 'ACCOUNT_LOCKED', 'unknown emails lock the same way')
  })

  test('CORS rejects unknown origins', async () => {
    const r = await alice.get('/items', { origin: 'https://evil.example' })
    assert.equal(r.headers.get('access-control-allow-origin'), null)
    const ok = await alice.get('/items', { origin: 'http://localhost:5173' })
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  })

  test('account deletion crypto-shreds and removes everything', async () => {
    const id = (await User.findOne({ email: 'alice@test.dev' }))._id
    const rawItem = await db.collection('items').findOne({ userId: id })

    assert.equal((await alice.del('/account', { confirm: 'nope' })).status, 400)
    assert.equal((await alice.del('/account', { confirm: 'DELETE MY ACCOUNT', password: 'wrong' })).status, 401)
    const r = await alice.del('/account', { confirm: 'DELETE MY ACCOUNT', password: 'correct horse battery' })
    assert.equal(r.status, 200)
    await wait(100)

    for (const col of ['items', 'spaces', 'auditlogs', 'userkeys']) {
      assert.equal(await db.collection(col).countDocuments({ userId: id }), 0, `${col} emptied`)
    }
    assert.equal(await User.countDocuments({ _id: id }), 0)

    // Even a backup copy of the ciphertext is now useless
    const { getUserCipher } = await import('../services/crypto.js')
    assert.equal((await getUserCipher(id)).decrypt(rawItem.content, 'Item.content'), '')
    assert.equal((await alice.get('/items')).status, 401, 'session cookies cleared')
  })

  test('login is rate limited', async () => {
    const c = srv.client()
    let last
    for (let i = 0; i < 25; i++) last = await c.post('/auth/login', { email: 'nobody@test.dev', password: 'x' })
    assert.equal(last.status, 429)
  })
})

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { setupEnv, connectFresh, startServer, skipNoDb, teardown } from './helpers.js'
import { makePdf } from './fixtures/makePdf.js'

const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'corpus-pdf-test-'))
setupEnv('corpus_test_pdf', { STORAGE_DRIVER: 'local', STORAGE_DIR: storageDir })

const pdfForm = (buffer, name = 'Sourdough Guide.pdf', fields = {}) => {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), name)
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v))
  return form
}

const GUIDE = makePdf([
  ['Sourdough Guide', 'Chapter one covers the starter.', 'Feed it flour and water daily.'],
  ['Chapter two', 'Bulk fermentation happens at 24 degrees.', 'Watch for bubbles and a domed surface.'],
  ['Appendix', 'Troubleshooting a sluggish levain.', 'Warmer water speeds things up.'],
])

describe('PDF documents', { skip: skipNoDb }, () => {
  let mongoose, srv, db, User, Item, drain, alice, bob, aliceId, guideId

  before(async () => {
    mongoose = await connectFresh()
    db = mongoose.connection.db
    User = (await import('../models/User.js')).default
    Item = (await import('../models/Item.js')).default
    await Item.init()
    await (await import('../models/ItemChunk.js')).default.init()
    ;({ drain } = await import('../services/queue.js'))
    ;(await import('../jobs/processPdf.js')).registerPdfJobs()
    srv = await startServer()

    const bcrypt = (await import('bcryptjs')).default
    const passwordHash = await bcrypt.hash('pw-for-tests-123', 4)
    aliceId = (await User.create({ email: 'alice@pdf.dev', passwordHash, credits: 20 }))._id
    await User.create({ email: 'bob@pdf.dev', passwordHash, credits: 20 })
    const login = async email => {
      const c = srv.client()
      assert.equal((await c.post('/auth/login', { email, password: 'pw-for-tests-123' })).status, 200)
      return c
    }
    alice = await login('alice@pdf.dev')
    bob = await login('bob@pdf.dev')
  })
  after(async () => {
    await srv.close()
    await teardown(mongoose)
    await fs.rm(storageDir, { recursive: true, force: true })
  })

  test('upload: charges credits, stores only ciphertext, queues processing', async () => {
    const r = await alice.upload('/items/pdf', pdfForm(GUIDE))
    assert.equal(r.status, 201, r.text)
    guideId = r.body.item._id
    assert.equal(r.body.item.type, 'pdf')
    assert.equal(r.body.item.title, 'Sourdough Guide')
    assert.equal(r.body.item.status, 'pending_ai')
    assert.equal(r.body.item.file.pageCount, 3)
    assert.equal(r.body.item.file.storageKey, undefined, 'storage key is internal')
    assert.equal(r.body.remainingCredits, 19)

    const raw = await db.collection('items').findOne({ _id: new mongoose.Types.ObjectId(guideId) })
    assert.match(raw.file.name, /^enc:v2:/, 'filename encrypted')
    const blob = await fs.readFile(path.join(storageDir, raw.file.storageKey))
    assert.equal(blob.subarray(0, 4).toString(), 'CRP1')
    assert.ok(!blob.includes('Sourdough'), 'no plaintext in the stored file')
    assert.equal((await User.findById(aliceId)).storageBytes, GUIDE.length)
  })

  test('processing: extracts every page into encrypted, indexed chunks', async () => {
    assert.ok((await drain()) >= 1)
    const item = (await alice.get(`/items/${guideId}`)).body.item
    assert.equal(item.status, 'ready')
    assert.equal(item.processing.stage, 'done')

    const chunks = await db.collection('itemchunks').find({ itemId: new mongoose.Types.ObjectId(guideId) }).toArray()
    assert.ok(chunks.length >= 1)
    assert.ok(chunks.every(c => c.text.startsWith('enc:v2:') && c.tokenIndex.length > 0))
    assert.ok(!JSON.stringify(chunks).toLowerCase().includes('fermentation'))
  })

  test('search finds words deep inside the PDF, with page + snippet', async () => {
    const r = await alice.get('/items/search?q=levain')
    assert.equal(r.status, 200)
    const hit = r.body.items.find(i => i._id === guideId)
    assert.ok(hit, 'found by a word that only appears on page 3')
    assert.equal(hit.match.pageStart, 3, 'exact page, even though all 3 short pages share one chunk')
    assert.match(hit.match.snippet, /levain/i)
    assert.equal((await bob.get('/items/search?q=levain')).body.items.length, 0, 'not visible to other users')

    // Search-as-you-type: partial words must match text deep inside the PDF
    for (const partial of ['lev', 'leva', 'levai', 'sluggi']) {
      const p = (await alice.get(`/items/search?q=${partial}`)).body.items.find(i => i._id === guideId)
      assert.ok(p?.match, `"${partial}" should match inside the PDF`)
      assert.equal(p.match.pageStart, 3)
    }
    // Prefix candidates are verified against the text: no false positives
    const none = (await alice.get('/items/search?q=levitation')).body.items.find(i => i._id === guideId)
    assert.ok(!none?.match, '"levitation" shares a prefix with "levain" but must not match')
  })

  test('file download and reader view are owner-only', async () => {
    const f = await alice.getBytes(`/items/${guideId}/file`)
    assert.equal(f.status, 200)
    assert.equal(f.headers.get('content-type'), 'application/pdf')
    assert.equal(f.headers.get('cache-control'), 'private, no-store')
    assert.ok(f.bytes.equals(GUIDE), 'decrypts to the exact original bytes')
    assert.equal((await bob.getBytes(`/items/${guideId}/file`)).status, 404)

    const t = await alice.get(`/items/${guideId}/text`)
    assert.ok(t.body.sections.map(s => s.text).join(' ').includes('Bulk fermentation'))
    assert.equal((await bob.get(`/items/${guideId}/text`)).status, 404)
  })

  test('the same file twice is detected as a duplicate (and not charged)', async () => {
    const before = (await User.findById(aliceId)).credits
    const r = await alice.upload('/items/pdf', pdfForm(GUIDE, 'renamed.pdf'))
    assert.equal(r.status, 409)
    assert.equal(r.body.item._id, guideId)
    assert.equal((await User.findById(aliceId)).credits, before)
    // ...but another user may save the same file
    assert.equal((await bob.upload('/items/pdf', pdfForm(GUIDE))).status, 201)
  })

  test('rejects non-PDFs and damaged PDFs without charging', async () => {
    const before = (await User.findById(aliceId)).credits
    const fake = await alice.upload('/items/pdf', pdfForm(Buffer.from('MZ\x90\x00 definitely an exe'), 'invoice.pdf'))
    assert.equal(fake.status, 415)
    const broken = await alice.upload('/items/pdf', pdfForm(Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(500, 66)]), 'broken.pdf'))
    assert.equal(broken.status, 422)
    assert.equal((await User.findById(aliceId)).credits, before)
  })

  test('plan limits: file size, page cap with honest notice, credit pricing', async () => {
    const big = Buffer.concat([GUIDE, Buffer.alloc(11 * 1024 * 1024)])
    const tooBig = await alice.upload('/items/pdf', pdfForm(big, 'big.pdf'))
    assert.equal(tooBig.status, 413)
    assert.equal(tooBig.body.code, 'PLAN_FILE_TOO_LARGE')

    const long = makePdf(Array.from({ length: 60 }, (_, i) => [`Page ${i + 1} of the long report`]))
    const before = (await User.findById(aliceId)).credits
    const r = await alice.upload('/items/pdf', pdfForm(long, 'Long Report.pdf'))
    assert.equal(r.status, 201, r.text)
    assert.equal(r.body.item.file.pagesIndexed, 50, 'free plan reads 50 pages')
    assert.match(r.body.notice, /first 50 of 60 pages/)
    assert.equal(before - r.body.remainingCredits, 2, '50 pages = 2 credits')
  })

  test('not enough credits → 402 with the price', async () => {
    await User.updateOne({ _id: aliceId }, { credits: 0 })
    const r = await alice.upload('/items/pdf', pdfForm(makePdf([['tiny']]), 'tiny.pdf'))
    assert.equal(r.status, 402)
    assert.equal(r.body.creditsNeeded, 1)
    await User.updateOne({ _id: aliceId }, { credits: 20 })
  })

  test('"keep away from AI": still searchable by keyword, never enriched', async () => {
    const secret = makePdf([['Employment contract', 'Salary clause: confidential compensation details.']])
    const r = await alice.upload('/items/pdf', pdfForm(secret, 'Contract.pdf', { aiOptOut: true }))
    assert.equal(r.status, 201)
    await drain()
    const item = (await alice.get(`/items/${r.body.item._id}`)).body.item
    assert.equal(item.aiOptOut, true)
    assert.equal(item.aiFailed, false, 'AI was skipped, not attempted')
    assert.equal(item.summary, '')
    assert.ok((await alice.get('/items/search?q=compensation')).body.items.some(i => i._id === r.body.item._id))
    assert.equal((await alice.post(`/items/${r.body.item._id}/retry-ai`)).status, 409)
  })

  test('repeated reads (e.g. a card polling for progress) coalesce into one log entry', async () => {
    const opened = async () => (await alice.get('/account/access-log?limit=100')).body.entries.filter(e => e.purpose === 'Opened an item')
    const before = await opened()
    for (let i = 0; i < 5; i++) await alice.get(`/items/${guideId}`)
    await new Promise(r => setTimeout(r, 100))
    const after = await opened()
    assert.ok(after.length - before.length <= 1, `5 reads added ${after.length - before.length} entries`)
    assert.ok(after.some(e => e.repeat >= 5), 'one entry carries the repeat count')
  })

  test('access log shows the server reading the PDF and the user opening it', async () => {
    const log = (await alice.get('/account/access-log?limit=100')).body.entries
    assert.ok(log.some(e => e.actor === 'system' && e.purpose === 'Reading your PDF to make it searchable'))
    assert.ok(log.some(e => e.purpose === 'Opened a PDF'))
    assert.ok(log.some(e => e.purpose === 'Opened reader view'))
  })

  test('account deletion removes files, chunks and jobs', async () => {
    const keys = (await db.collection('items').find({ userId: aliceId, type: 'pdf' }).toArray()).map(i => i.file.storageKey)
    assert.ok(keys.length >= 3)
    assert.equal((await alice.del('/account', { confirm: 'DELETE MY ACCOUNT', password: 'pw-for-tests-123' })).status, 200)
    await new Promise(r => setTimeout(r, 200))
    for (const k of keys) await assert.rejects(fs.access(path.join(storageDir, k)), 'blob deleted')
    assert.equal(await db.collection('itemchunks').countDocuments({ userId: aliceId }), 0)
    assert.equal(await db.collection('jobs').countDocuments({ userId: aliceId }), 0)
  })
})

describe('document summary helpers', () => {
  test('TLDR is hard-capped at 30 words', async () => {
    setupEnv('unused')
    const { limitWords } = await import('../services/ai/documentSummary.js')
    const long = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ')
    assert.equal(limitWords(long, 30).replace('…', '').split(' ').length, 30)
    assert.equal(limitWords('short and sweet', 30), 'short and sweet')
  })

  test('long documents are sampled evenly, keeping first and last', async () => {
    setupEnv('unused')
    const { buildSections } = await import('../services/ai/documentSummary.js')
    const chunks = Array.from({ length: 40 }, (_, i) => ({ text: 'x'.repeat(3000), pageStart: i + 1, pageEnd: i + 1 }))
    const sections = buildSections(chunks, 4)
    assert.equal(sections.length, 4)
    assert.equal(sections[0].pageStart, 1)
    assert.equal(sections.at(-1).pageEnd, 40)
  })
})

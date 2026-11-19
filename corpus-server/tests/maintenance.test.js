import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupEnv, connectFresh, skipNoDb } from './helpers.js'

setupEnv('corpus_test_maintenance')
const run = promisify(execFile)
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('maintenance jobs', { skip: skipNoDb }, () => {
  let mongoose, db, Item
  const uid = () => new mongoose.Types.ObjectId()

  before(async () => {
    mongoose = await connectFresh()
    db = mongoose.connection.db
    Item = (await import('../models/Item.js')).default
  })
  after(() => mongoose.disconnect())

  test('trash purge removes only items past the retention window', async () => {
    const { purgeTrash } = await import('../jobs/purgeTrash.js')
    const userId = uid()
    const day = 86400 * 1000
    await Item.create({ userId, type: 'image', content: 'old trash', thumbnailUrl: 'https://img.example/a.png', deletedAt: new Date(Date.now() - 31 * day) })
    await Item.create({ userId, type: 'note', content: 'recent trash', deletedAt: new Date(Date.now() - 2 * day) })
    await Item.create({ userId, type: 'note', content: 'live' })

    assert.equal(await purgeTrash(), 1)
    const left = (await Item.find({ userId })).map(i => i.content).sort()
    assert.deepEqual(left, ['live', 'recent trash'])

    const log = await db.collection('auditlogs').findOne({ userId, actor: 'system' })
    assert.equal(log.purpose, 'Permanently deleting items from trash')
  })

  test('migration upgrades plaintext rows and drops the text index', async () => {
    const userId = uid()
    await db.collection('items').insertOne({
      userId, type: 'link', title: 'Old plain', content: 'legacy body', url: 'https://old.example',
      tags: ['legacy', 'web'], summary: 's', note: '', deletedAt: null, archived: false,
    })
    await db.collection('items').createIndex({ title: 'text' }, { name: 'corpus_text_index' })
    await db.collection('spaces').insertOne({ userId, name: 'Old space' })

    const { stdout } = await run(process.execPath, ['scripts/encryptExistingData.js', '--apply'], { cwd: serverRoot, env: process.env })
    assert.match(stdout, /upgraded=1/)

    const raw = await db.collection('items').findOne({ userId })
    assert.match(raw.title, /^enc:v2:/)
    assert.ok(raw.tags.every(t => t.startsWith('enc:v2:')))
    assert.match((await db.collection('spaces').findOne({ userId })).name, /^enc:v2:/)
    assert.ok(!(await db.collection('items').listIndexes().toArray()).some(i => i.textIndexVersion))

    const { blindIndexFor } = await import('../services/crypto.js')
    const found = await Item.findOne({ userId, tagIndex: await blindIndexFor(userId, 'web', 'Item.tags') })
    assert.equal(found.content, 'legacy body')
    assert.equal(found.url, 'https://old.example')

    const again = await run(process.execPath, ['scripts/encryptExistingData.js', '--apply'], { cwd: serverRoot, env: process.env })
    assert.match(again.stdout, /upgraded=0/, 'idempotent')
  })
})

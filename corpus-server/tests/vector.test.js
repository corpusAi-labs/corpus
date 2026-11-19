import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setupEnv, connectFresh, skipNoDb } from './helpers.js'

setupEnv('corpus_test_vector', { VECTOR_SEARCH_BACKEND: 'app' })

// Unit vectors along different axes (768-dim), plus a blend, so the expected ranking is exact
const axis = (i, w = 1) => Array.from({ length: 768 }, (_, j) => (j === i ? w : 0))
const blend = (a, b) => a.map((x, i) => x + b[i])

describe('in-app vector engine', { skip: skipNoDb }, () => {
  let mongoose, Item, vectorQuery, alice, bob

  before(async () => {
    mongoose = await connectFresh()
    Item = (await import('../models/Item.js')).default
    ;({ vectorQuery } = await import('../services/search/vectorStore.js'))
    alice = new mongoose.Types.ObjectId()
    bob = new mongoose.Types.ObjectId()
    const mk = (userId, title, embedding, extra = {}) => Item.create({ userId, type: 'note', title, content: title, embedding, ...extra })
    await mk(alice, 'exact', axis(0))
    await mk(alice, 'related', blend(axis(0), axis(1)))
    await mk(alice, 'unrelated', axis(2))
    await mk(alice, 'deleted twin', axis(0), { deletedAt: new Date() })
    await mk(bob, 'bob exact', axis(0))
  })
  after(() => mongoose.disconnect())

  test('ranks by cosine, scores in Atlas convention (1+cos)/2', async () => {
    const r = await vectorQuery(Item, { userId: alice, queryVector: axis(0, 3), k: 10, filter: { deletedAt: null }, project: { embedding: 0 } })
    assert.deepEqual(r.map(i => i.title), ['exact', 'related', 'unrelated'])
    assert.equal(r[0].score.toFixed(3), '1.000')
    assert.equal(r[1].score.toFixed(3), ((1 + Math.SQRT1_2) / 2).toFixed(3))
    assert.equal(r[2].score.toFixed(3), '0.500')
  })

  test('only the owner\'s vectors are searched, filters apply, results are decrypted', async () => {
    const r = await vectorQuery(Item, { userId: alice, queryVector: axis(0), k: 10, filter: { deletedAt: null }, project: { embedding: 0 } })
    assert.ok(!r.some(i => i.title === 'bob exact'), 'isolation')
    assert.ok(!r.some(i => i.title === 'deleted twin'), 'filter')
    assert.ok(r.every(i => !String(i.title).startsWith('enc:')), 'hydrated through the decrypting model')
  })
})

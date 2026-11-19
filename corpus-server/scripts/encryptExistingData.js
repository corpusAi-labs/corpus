/**
 * Migration: upgrade every Item/Space to per-user envelope encryption (v2).
 *   - plaintext rows   → encrypted with the owner's DEK
 *   - v1 rows (global key) → re-encrypted with the owner's DEK
 *   - blind indexes (tagIndex, urlHash) rebuilt with the owner's index key
 * Idempotent: rows already fully on v2 are skipped.
 *
 *   npm run encrypt:migrate            # dry run
 *   npm run encrypt:migrate -- --apply # write
 *
 * Back up the database first. Keep DATA_ENCRYPTION_KEY set while v1 data exists.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { getUserCipher, isCurrentFormat, assertEncryptionConfigured } from '../services/crypto.js'

const ITEM_FIELDS = ['title', 'content', 'url', 'thumbnailUrl', 'faviconUrl', 'summary', 'tldr', 'note']
const BATCH = 200
const needsUpgrade = v => typeof v === 'string' && v !== '' && !isCurrentFormat(v)

async function migrateItems(db, apply) {
  const col = db.collection('items')
  let scanned = 0, changed = 0, skipped = 0, ops = []

  for await (const doc of col.find({})) {
    scanned++
    if (!doc.userId) { skipped++; continue }
    const tags = Array.isArray(doc.tags) ? doc.tags : []
    const stale =
      ITEM_FIELDS.some(f => needsUpgrade(doc[f])) || tags.some(needsUpgrade) ||
      !Array.isArray(doc.tagIndex) || (doc.url && !doc.urlHash)
    if (!stale) continue

    const c = await getUserCipher(doc.userId)
    const $set = {}
    for (const f of ITEM_FIELDS) if (needsUpgrade(doc[f])) $set[f] = c.encrypt(doc[f], `Item.${f}`)
    $set.tags = tags.map(t => c.encrypt(t, 'Item.tags'))
    $set.tagIndex = tags.map(t => c.blindIndex(c.decrypt(t, 'Item.tags'), 'Item.tags')).filter(Boolean)
    $set.urlHash = doc.url ? c.blindIndex(c.decrypt(doc.url, 'Item.url'), 'Item.url') : null

    changed++
    ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set } } })
    if (apply && ops.length >= BATCH) { await col.bulkWrite(ops); ops = [] }
  }
  if (apply && ops.length) await col.bulkWrite(ops)
  console.log(`[items]  scanned=${scanned} upgraded=${changed} skipped(no userId)=${skipped}`)
}

async function migrateSpaces(db, apply) {
  const col = db.collection('spaces')
  let scanned = 0, changed = 0
  for await (const doc of col.find({})) {
    scanned++
    if (!doc.userId || !needsUpgrade(doc.name)) continue
    changed++
    if (apply) {
      const c = await getUserCipher(doc.userId)
      await col.updateOne({ _id: doc._id }, { $set: { name: c.encrypt(doc.name, 'Space.name') } })
    }
  }
  console.log(`[spaces] scanned=${scanned} upgraded=${changed}`)
}

async function run() {
  const apply = process.argv.includes('--apply')
  await assertEncryptionConfigured()
  await mongoose.connect(process.env.MONGO_URI)
  const db = mongoose.connection.db
  console.log(apply ? '--- APPLYING ---' : '--- DRY RUN (pass --apply to write) ---')
  if (!apply) console.log('note: dry run still creates per-user keys for users that lack one')

  await migrateItems(db, apply)
  await migrateSpaces(db, apply)

  if (apply) {
    for (const idx of (await db.collection('items').listIndexes().toArray()).filter(i => i.textIndexVersion)) {
      await db.collection('items').dropIndex(idx.name)
      console.log('[items]  dropped plaintext text index:', idx.name)
    }
  }
  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => { console.error('Migration failed:', err); process.exit(1) })

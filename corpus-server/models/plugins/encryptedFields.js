import { getUserCipher } from '../../services/crypto.js'
import { recordAccess } from '../../services/requestContext.js'

/**
 * Mongoose plugin: transparent, per-user field encryption.
 *
 *   itemSchema.plugin(encryptedFieldsPlugin, {
 *     model: 'Item',                       // used in the AAD context ("Item.title")
 *     fields: ['title', 'content'],        // encrypted strings
 *     arrayFields: ['tags'],               // encrypted string arrays (per element)
 *     blindIndexes: { tagIndex: { from: 'tags', array: true } },
 *   })
 *
 * Every document must carry a `userId`: it selects the owner's key and is
 * bound into each ciphertext. Reads are recorded in the request context so
 * they appear in the owner's access log.
 *
 * Covered: save/create, findOneAndUpdate, updateOne, updateMany, find,
 * findOne, findOneAndDelete, aggregate. NOT covered (don't use them on
 * encrypted paths): insertMany, bulkWrite, distinct, $push/$addToSet, raw
 * driver access.
 */
export default function encryptedFieldsPlugin(schema, { model, fields = [], arrayFields = [], blindIndexes = {} }) {
  if (!model) throw new Error('[encryptedFields] `model` option is required')
  const allEncrypted = [...fields, ...arrayFields]
  const ctxOf = path => `${model}.${path}`
  const isArray = path => arrayFields.includes(path)

  const encValue = (cipher, path, value) =>
    isArray(path)
      ? (Array.isArray(value) ? value.map(v => cipher.encrypt(v, ctxOf(path))) : value)
      : cipher.encrypt(value, ctxOf(path))

  const decValue = (cipher, path, value) =>
    isArray(path)
      ? (Array.isArray(value) ? value.map(v => cipher.decrypt(v, ctxOf(path))) : value)
      : cipher.decrypt(value, ctxOf(path))

  const indexValue = (cipher, cfg, plain) => {
    const context = ctxOf(cfg.from)
    if (cfg.array) return Array.isArray(plain) ? plain.map(v => cipher.blindIndex(v, context)).filter(Boolean) : []
    return cipher.blindIndex(plain, context)
  }

  const isMongooseDoc = doc => typeof doc?.$isDefault === 'function'

  async function decryptDocs(docs) {
    const list = (Array.isArray(docs) ? docs : [docs]).filter(d => d && typeof d === 'object')
    const ciphers = new Map()

    for (const doc of list) {
      const mdoc = isMongooseDoc(doc)
      const userId = mdoc ? doc.get('userId') : doc.userId
      if (!userId) continue
      const uid = String(userId)
      if (!ciphers.has(uid)) ciphers.set(uid, await getUserCipher(uid))
      const cipher = ciphers.get(uid)

      let touched = false
      for (const path of allEncrypted) {
        const current = mdoc ? doc.get(path) : doc[path]
        if (current === undefined || current === null) continue
        const plain = decValue(cipher, path, Array.isArray(current) ? [...current] : current)
        if (mdoc) {
          doc.set(path, plain)
          doc.unmarkModified(path)
        } else {
          doc[path] = plain
        }
        touched = true
      }
      if (touched) recordAccess(model, uid, doc._id)
    }
  }

  // ── WRITE: save / create ──
  schema.pre('save', async function () {
    const touchesEncrypted =
      this.isNew || allEncrypted.some(p => this.isModified(p)) || Object.values(blindIndexes).some(c => this.isModified(c.from))
    if (!touchesEncrypted) return
    if (!this.userId) throw new Error(`[encryptedFields] ${model} requires userId to encrypt`)
    const cipher = await getUserCipher(this.userId)

    for (const [indexPath, cfg] of Object.entries(blindIndexes)) {
      if (this.isNew || this.isModified(cfg.from)) {
        const plain = this.get(cfg.from)
        this.set(indexPath, indexValue(cipher, cfg, Array.isArray(plain) ? [...plain] : plain))
      }
    }
    for (const path of allEncrypted) {
      if (!this.isNew && !this.isModified(path)) continue
      const value = this.get(path)
      if (value === undefined || value === null) continue
      this.set(path, encValue(cipher, path, Array.isArray(value) ? [...value] : value))
    }
  })

  // Hand the caller back plaintext after saving (not an "access" — they just wrote it)
  schema.post('save', async function (doc) {
    const cipher = await getUserCipher(doc.userId)
    for (const path of allEncrypted) {
      const v = doc.get(path)
      if (v === undefined || v === null) continue
      doc.set(path, decValue(cipher, path, Array.isArray(v) ? [...v] : v))
      doc.unmarkModified(path)
    }
  })

  // ── WRITE: update queries ──
  async function encryptUpdate() {
    const update = this.getUpdate()
    if (!update || Array.isArray(update)) return

    for (const op of ['$push', '$addToSet', '$setOnInsert']) {
      if (update[op] && allEncrypted.some(p => p in update[op])) {
        throw new Error(`[encryptedFields] ${op} on encrypted fields is not supported`)
      }
    }

    const containers = [update, update.$set].filter(Boolean)
    const touches = containers.some(c => allEncrypted.some(p => p in c))
    if (!touches) return

    let userId = this.getQuery()?.userId
    if (!userId) {
      if (this.op === 'updateMany') {
        throw new Error('[encryptedFields] updateMany on encrypted fields must filter by userId')
      }
      const existing = await this.model.findOne(this.getQuery()).select('userId').lean()
      userId = existing?.userId
      if (!userId) return // nothing will match; let the query no-op
    }
    const cipher = await getUserCipher(userId)

    for (const container of containers) {
      for (const [indexPath, cfg] of Object.entries(blindIndexes)) {
        if (cfg.from in container) container[indexPath] = indexValue(cipher, cfg, container[cfg.from])
      }
      for (const path of allEncrypted) {
        if (container[path] !== undefined && container[path] !== null) {
          container[path] = encValue(cipher, path, container[path])
        }
      }
    }
    this.setUpdate(update)
  }
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], encryptUpdate)

  // ── READ ──
  // Inclusive projections (e.g. .select('tags')) must still fetch userId,
  // otherwise we can't pick the right key.
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'], function () {
    const p = this.projection()
    if (!p || typeof p !== 'object') return
    const entries = Object.entries(p).filter(([k]) => k !== '_id' && !k.startsWith('+'))
    if (entries.length && entries.every(([, v]) => v === 1 || v === true)) this.select('userId')
  })

  schema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'], async function (res) {
    await decryptDocs(res)
  })

  schema.post('aggregate', async function (res) {
    await decryptDocs(res)
  })
}

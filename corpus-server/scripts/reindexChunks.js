/**
 * Rebuild the encrypted keyword index (`itemchunks.tokenIndex`) from the
 * stored, encrypted chunk text. Local only — no AI calls, no re-upload.
 * Run after changing the tokenizer/index format.
 *
 *   npm run search:reindex
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import ItemChunk from '../models/ItemChunk.js'
import { assertEncryptionConfigured, getUserCipher } from '../services/crypto.js'
import { chunkIndexHashes } from '../services/search/documentSearch.js'
import { runAsSystem } from '../services/audit.js'

async function run() {
  await assertEncryptionConfigured()
  await mongoose.connect(process.env.MONGO_URI)
  let n = 0
  await runAsSystem('Rebuilding your search index', async () => {
    for await (const chunk of ItemChunk.find({}).cursor()) {
      const cipher = await getUserCipher(chunk.userId)
      await ItemChunk.updateOne({ _id: chunk._id }, { $set: { tokenIndex: chunkIndexHashes(cipher, chunk.text) } })
      n++
    }
  })
  console.log(`Re-indexed ${n} chunk(s).`)
  await mongoose.disconnect()
}

run().catch(err => { console.error('Reindex failed:', err); process.exit(1) })

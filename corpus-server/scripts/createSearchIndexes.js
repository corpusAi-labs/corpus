/**
 * Create the Atlas Vector Search indexes used by Deep Recall.
 * Requires MongoDB Atlas (vector search isn't available on a plain mongod).
 *
 *   npm run search:indexes
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const vectorIndex = (name, extraFilters = []) => ({
  name,
  type: 'vectorSearch',
  definition: {
    fields: [
      { type: 'vector', path: 'embedding', numDimensions: 768, similarity: 'cosine' },
      { type: 'filter', path: 'userId' },
      ...extraFilters.map(path => ({ type: 'filter', path })),
    ],
  },
})

const INDEXES = {
  items: vectorIndex('vector_index'),
  itemchunks: vectorIndex('chunk_vector_index'),
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  const db = mongoose.connection.db
  for (const [collection, spec] of Object.entries(INDEXES)) {
    const col = db.collection(collection)
    const existing = await col.listSearchIndexes(spec.name).toArray().catch(() => [])
    if (existing.length) {
      console.log(`[${collection}] ${spec.name} already exists — skipping`)
      continue
    }
    await col.createSearchIndex(spec)
    console.log(`[${collection}] created ${spec.name} (builds in the background on Atlas)`)
  }
  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Failed:', err.message)
  process.exit(1)
})

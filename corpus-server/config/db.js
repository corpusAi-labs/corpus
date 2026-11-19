import mongoose from 'mongoose'

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI
    if (!uri) throw new Error('MONGO_URI is not set in .env')
    await mongoose.connect(uri)
    console.log('[db] connected to MongoDB')

    // Item content is encrypted at rest, so any MongoDB text index is useless
    // (it would only index ciphertext). Drop it if an older version created one.
    try {
      const Item = mongoose.model('Item')
      const indexes = await Item.collection.listIndexes().toArray()
      for (const idx of indexes.filter(i => i.textIndexVersion)) {
        await Item.collection.dropIndex(idx.name)
        console.log('[db] dropped text index:', idx.name)
      }
    } catch (e) {
      // collection may not exist yet — that's fine
    }

  } catch (err) {
    console.error('[db] connection failed:', err.message)
    process.exit(1)
  }
}

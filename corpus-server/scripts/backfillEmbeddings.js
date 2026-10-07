import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import Item from '../models/Item.js'
import { buildItemEmbeddingText, generateEmbedding } from '../services/embedding.js'

async function runBackfill() {
  console.log('--- Starting Embedding Backfill Script ---')
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is not set in .env')
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB Atlas')

    const force = process.argv.includes('--force')

    // Find items missing embeddings (or all if force)
    const query = { deletedAt: null }
    if (!force) {
      query.$or = [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } },
      ]
    }

    const items = await Item.find(query).select('+embedding')

    console.log(`Found ${items.length} items to embed (force=${force}).`)

    if (items.length === 0) {
      console.log('All active items already have embeddings. Nothing to backfill.')
      await mongoose.disconnect()
      process.exit(0)
    }

    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const textToEmbed = buildItemEmbeddingText(item)

      if (!textToEmbed) {
        console.warn(`[${i + 1}/${items.length}] Skipping item ${item._id}: No text content to embed.`)
        continue
      }

      try {
        const embedding = await generateEmbedding(textToEmbed, 'RETRIEVAL_DOCUMENT')
        if (embedding && embedding.length === 768) {
          await Item.updateOne({ _id: item._id }, { embedding })
          successCount++
          console.log(`[${i + 1}/${items.length}] Vectorized item ${item._id} (${item.title || item.type})`)
        } else {
          failureCount++
          console.warn(`[${i + 1}/${items.length}] Failed to get valid 768-dim embedding for ${item._id}`)
        }
      } catch (err) {
        failureCount++
        console.error(`[${i + 1}/${items.length}] Error embedding item ${item._id}:`, err.message)
      }

      // Small rate-limit delay between embedding requests
      await new Promise(r => setTimeout(r, 120))
    }

    console.log('\n--- Backfill Summary ---')
    console.log(`Successfully vectorized: ${successCount}`)
    console.log(`Failed / Skipped: ${failureCount}`)
    console.log('------------------------\n')

    await mongoose.disconnect()
    console.log('MongoDB connection closed.')
    process.exit(0)
  } catch (err) {
    console.error('Fatal backfill error:', err)
    process.exit(1)
  }
}

runBackfill()

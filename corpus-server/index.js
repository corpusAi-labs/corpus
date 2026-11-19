import 'dotenv/config'
import { getEnv } from './config/env.js'
import { connectDB } from './config/db.js'
import { assertEncryptionConfigured } from './services/crypto.js'
import { scheduleTrashPurge } from './jobs/purgeTrash.js'
import { registerPdfJobs } from './jobs/processPdf.js'
import { startWorkers, stopWorkers } from './services/queue.js'
import { getKv, closeRedis } from './services/redis.js'
import mongoose from 'mongoose'
import { createApp } from './app.js'

async function start() {
  const env = getEnv() // throws with a readable list of problems if misconfigured
  await assertEncryptionConfigured() // KEK provider must be reachable before we accept traffic
  await connectDB()

  getKv() // connect Redis early (if configured)

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT} (NODE_ENV=${env.NODE_ENV})`)
    console.log(`[server] key provider: ${env.KEY_PROVIDER} · cache: ${getKv().backend}`)
    console.log(`[server] GROQ_API_KEY ${process.env.GROQ_API_KEY ? 'set' : 'MISSING — AI tagging disabled'}`)
    console.log(`[server] Google OAuth ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'not configured'}`)
  })

  scheduleTrashPurge()
  registerPdfJobs()
  startWorkers() // background job queue (PDF processing); safe to run on every instance

  // Graceful shutdown (deploys/restarts): stop taking work, finish in-flight requests, close connections
  const shutdown = signal => {
    console.log(`[server] ${signal} received, shutting down`)
    stopWorkers()
    server.close(async () => {
      await closeRedis()
      await mongoose.disconnect()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

start().catch(err => {
  console.error(err.message)
  process.exit(1)
})

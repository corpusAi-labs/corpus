import 'dotenv/config'
import { getEnv } from './config/env.js'
import { connectDB } from './config/db.js'
import { assertEncryptionConfigured } from './services/crypto.js'
import { scheduleTrashPurge } from './jobs/purgeTrash.js'
import { registerPdfJobs } from './jobs/processPdf.js'
import { startWorkers } from './services/queue.js'
import { createApp } from './app.js'

async function start() {
  const env = getEnv() // throws with a readable list of problems if misconfigured
  await assertEncryptionConfigured() // KEK provider must be reachable before we accept traffic
  await connectDB()

  const app = createApp()
  app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT} (NODE_ENV=${env.NODE_ENV})`)
    console.log(`[server] key provider: ${env.KEY_PROVIDER}`)
    console.log(`[server] GROQ_API_KEY ${process.env.GROQ_API_KEY ? 'set' : 'MISSING — AI tagging disabled'}`)
    console.log(`[server] Google OAuth ${process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'not configured'}`)
  })

  scheduleTrashPurge()
  registerPdfJobs()
  startWorkers() // background job queue (PDF processing); safe to run on every instance
}

start().catch(err => {
  console.error(err.message)
  process.exit(1)
})

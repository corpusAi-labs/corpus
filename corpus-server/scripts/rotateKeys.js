/**
 * KEK rotation: re-wrap every user's DEK under the current KEK.
 * User data is NOT re-encrypted — only the 32-byte wrapped keys change —
 * so this is fast and safe to run on a live system.
 *
 *   npm run keys:rotate            # dry run
 *   npm run keys:rotate -- --apply
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { assertEncryptionConfigured } from '../services/crypto.js'
import { rewrapAllKeys } from '../services/keys/keyService.js'

async function run() {
  const apply = process.argv.includes('--apply')
  await assertEncryptionConfigured()
  await mongoose.connect(process.env.MONGO_URI)
  const n = await rewrapAllKeys({ dryRun: !apply })
  console.log(apply ? `Re-wrapped ${n} key(s).` : 'Dry run — pass --apply to re-wrap.')
  await mongoose.disconnect()
}

run().catch(err => { console.error('Rotation failed:', err); process.exit(1) })

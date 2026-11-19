import Item from '../models/Item.js'
import ItemChunk from '../models/ItemChunk.js'
import User from '../models/User.js'
import { deleteFile } from '../services/storage/index.js'
import { getEnv } from '../config/env.js'
import { runAsSystem } from '../services/audit.js'
import { destroyMedia } from '../services/media.js'

/**
 * Soft-deleted items are kept TRASH_RETENTION_DAYS (undo window), then
 * permanently removed together with their media files.
 */
const BATCH = 500

export async function purgeTrash({ now = Date.now() } = {}) {
  const cutoff = new Date(now - getEnv().TRASH_RETENTION_DAYS * 86400 * 1000)
  let total = 0

  for (;;) {
    const batch = await runAsSystem('Permanently deleting items from trash', () =>
      Item.find({ deletedAt: { $lte: cutoff } }).select('userId thumbnailUrl file.storageKey file.sizeBytes').limit(BATCH)
    )
    if (batch.length === 0) break
    const ids = batch.map(i => i._id)
    await ItemChunk.deleteMany({ itemId: { $in: ids } })
    await Item.deleteMany({ _id: { $in: ids } })
    await destroyMedia(batch.map(i => i.thumbnailUrl).filter(Boolean))
    for (const i of batch.filter(i => i.file?.storageKey)) {
      await deleteFile(i.file.storageKey)
      await User.updateOne({ _id: i.userId }, { $inc: { storageBytes: -(i.file.sizeBytes || 0) } })
    }
    total += batch.length
    if (batch.length < BATCH) break
  }
  if (total) console.log(`[purgeTrash] permanently deleted ${total} item(s)`)
  return total
}

export function scheduleTrashPurge({ intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  const run = () => purgeTrash().catch(err => console.error('[purgeTrash]', err.message))
  setTimeout(run, 60 * 1000).unref()
  setInterval(run, intervalMs).unref()
}

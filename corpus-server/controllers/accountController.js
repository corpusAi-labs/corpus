import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { z } from 'zod'
import User from '../models/User.js'
import Item from '../models/Item.js'
import Space from '../models/Space.js'
import Otp from '../models/Otp.js'
import AuditLog from '../models/AuditLog.js'
import ItemChunk from '../models/ItemChunk.js'
import Job from '../models/Job.js'
import { deleteFile } from '../services/storage/index.js'
import { shredUserKey } from '../services/keys/keyService.js'
import { destroyMedia, presentItem } from '../services/media.js'
import { auditEvent } from '../services/audit.js'
import { getContext } from '../services/requestContext.js'
import { getEnv } from '../config/env.js'

const isProd = process.env.NODE_ENV === 'production'
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' }

// ── Access log ────────────────────────────────────────────────────────────

/** GET /api/account/access-log?cursor=<id>&limit=50&type=data.access|auth */
export async function listAccessLog(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const query = { userId: req.user.id }
    if (req.query.type === 'data.access') query.type = 'data.access'
    else if (req.query.type === 'auth') query.type = { $regex: /^auth\./ }
    if (req.query.cursor && mongoose.isValidObjectId(req.query.cursor)) query._id = { $lt: req.query.cursor }

    const entries = await AuditLog.find(query).sort({ _id: -1 }).limit(limit + 1).lean()
    const hasMore = entries.length > limit
    const page = (hasMore ? entries.slice(0, limit) : entries).map(e => ({
      id: e._id,
      at: e.createdAt,
      actor: e.actor,
      type: e.type,
      purpose: e.purpose,
      action: e.action,
      resources: (e.resources || []).map(r => ({ model: r.model, count: r.count })),
      ip: e.ip,
      userAgent: e.userAgent,
      repeat: e.repeat || 1,
      lastAt: e.lastAt,
    }))
    return res.json({
      entries: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      retentionDays: getEnv().AUDIT_RETENTION_DAYS,
    })
  } catch (err) {
    console.error('[listAccessLog]', err.message)
    return res.status(500).json({ error: 'Failed to load access log' })
  }
}

const csvCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`

/** GET /api/account/access-log/download — full retention window as CSV */
export async function downloadAccessLog(req, res) {
  try {
    const entries = await AuditLog.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    const header = ['time', 'last_time', 'times', 'actor', 'type', 'purpose', 'items_accessed', 'spaces_accessed', 'ip', 'user_agent', 'request_id']
    const rows = entries.map(e => {
      const count = m => (e.resources || []).filter(r => r.model === m).reduce((s, r) => s + r.count, 0)
      return [e.createdAt.toISOString(), (e.lastAt || e.createdAt).toISOString(), e.repeat || 1, e.actor, e.type, e.purpose, count('Item'), count('Space'), e.ip, e.userAgent, e.requestId]
        .map(csvCell).join(',')
    })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="corpus-access-log-${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.send([header.join(','), ...rows].join('\n'))
  } catch (err) {
    console.error('[downloadAccessLog]', err.message)
    return res.status(500).json({ error: 'Failed to export access log' })
  }
}

// ── Data portability ──────────────────────────────────────────────────────

/** GET /api/account/export — everything we hold about the user, decrypted, as JSON */
export async function exportData(req, res) {
  try {
    const [user, items, spaces] = await Promise.all([
      User.findById(req.user.id).lean(),
      Item.find({ userId: req.user.id }).sort({ createdAt: 1 }),
      Space.find({ userId: req.user.id }).sort({ createdAt: 1 }),
    ])
    if (!user) return res.status(404).json({ error: 'User not found' })

    const payload = {
      exportedAt: new Date().toISOString(),
      format: 'corpus-export/v1',
      account: { name: user.name, email: user.email, plan: user.plan, credits: user.credits, createdAt: user.createdAt },
      spaces: spaces.map(s => ({ id: s._id, name: s.name, color: s.color, createdAt: s.createdAt })),
      items: items.map(presentItem),
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="corpus-export-${new Date().toISOString().slice(0, 10)}.json"`)
    return res.send(JSON.stringify(payload, null, 2))
  } catch (err) {
    console.error('[exportData]', err.message)
    return res.status(500).json({ error: 'Export failed' })
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────

/** POST /api/account/sign-out-everywhere */
export async function signOutEverywhere(req, res) {
  try {
    await User.updateOne({ _id: req.user.id }, { refreshTokens: [], rotatedTokens: [] })
    auditEvent(req.user.id, 'auth.logout_all', 'Signed out of all devices', req)
    res.clearCookie('refreshToken', cookieOpts)
    res.clearCookie('accessToken', cookieOpts)
    return res.json({ success: true })
  } catch (err) {
    console.error('[signOutEverywhere]', err.message)
    return res.status(500).json({ error: 'Failed to sign out sessions' })
  }
}

// ── Deletion ──────────────────────────────────────────────────────────────

const deleteSchema = z.object({
  confirm: z.literal('DELETE MY ACCOUNT'),
  password: z.string().optional(),
})

/**
 * DELETE /api/account
 *
 * 1. Re-authenticate (password accounts must re-enter their password).
 * 2. Collect media references while we can still decrypt them.
 * 3. Crypto-shred: destroy the user's DEK. From this instant every ciphertext
 *    they own — including copies in database backups — is unreadable.
 * 4. Delete all rows, then (best effort, async) the media files.
 */
export async function deleteAccount(req, res) {
  const parsed = deleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Type "DELETE MY ACCOUNT" to confirm.' })
  }
  const userId = req.user.id

  try {
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.passwordHash) {
      const ok = parsed.data.password && (await bcrypt.compare(parsed.data.password, user.passwordHash))
      if (!ok) return res.status(401).json({ error: 'Incorrect password.' })
    }

    const items = await Item.find({ userId }).select('thumbnailUrl file.storageKey')
    const media = items.map(i => i.thumbnailUrl).filter(Boolean)
    const files = items.map(i => i.file?.storageKey).filter(Boolean)

    await shredUserKey(userId)
    await Promise.all([
      Item.deleteMany({ userId }),
      ItemChunk.deleteMany({ userId }),
      Job.deleteMany({ userId }),
      Space.deleteMany({ userId }),
      AuditLog.deleteMany({ userId }),
      Otp.deleteMany({ email: user.email }),
    ])
    await User.deleteOne({ _id: userId })

    // Don't write an access-log entry for a user that no longer exists
    getContext()?.access.delete(String(userId))

    res.clearCookie('refreshToken', cookieOpts)
    res.clearCookie('accessToken', cookieOpts)
    res.json({ success: true })

    destroyMedia(media).then(n => console.log(`[deleteAccount] removed ${n} media file(s) for deleted user`))
    Promise.all(files.map(deleteFile)) // already unreadable (key shredded); this frees the storage
  } catch (err) {
    console.error('[deleteAccount]', err.message)
    return res.status(500).json({ error: 'Account deletion failed' })
  }
}

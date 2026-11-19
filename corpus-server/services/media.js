import { v2 as cloudinary } from 'cloudinary'
import { getEnv } from '../config/env.js'

/**
 * Private media storage.
 *
 * User uploads are stored as Cloudinary `authenticated` assets inside a
 * per-user folder, so they can't be fetched by guessing a public URL. The DB
 * stores an opaque reference (encrypted like every other field):
 *
 *     cld:<deliveryType>/<resourceType>/<publicId>.<format>
 *
 * and the API turns it into a short-lived signed download URL at response
 * time. Expiry is bucketed so URLs stay stable (and browser-cacheable) for a
 * while instead of changing on every request.
 */
const PREFIX = 'cld:'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const isMediaRef = v => typeof v === 'string' && v.startsWith(PREFIX)
export const userMediaFolder = userId => `corpus/u/${String(userId)}`

export function parseRef(ref) {
  const m = /^cld:(authenticated|private|upload)\/(image|video|raw)\/(.+)\.([a-z0-9]+)$/i.exec(ref || '')
  if (!m) return null
  return { type: m[1], resourceType: m[2], publicId: m[3], format: m[4] }
}

/** A user may only attach media that lives in their own folder. */
export function isOwnedRef(ref, userId) {
  const parsed = parseRef(ref)
  return !!parsed && parsed.publicId.startsWith(`${userMediaFolder(userId)}/`)
}

export function uploadPrivate(buffer, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: userMediaFolder(userId), resource_type: 'image', type: 'authenticated' },
      (err, result) => {
        if (err) return reject(err)
        resolve(`${PREFIX}authenticated/image/${result.public_id}.${result.format}`)
      }
    )
    stream.end(buffer)
  })
}

/** Short-lived signed URL for a media ref; other values pass through unchanged. */
export function deliveryUrl(value) {
  const parsed = parseRef(value)
  if (!parsed) return isMediaRef(value) ? null : value
  const ttl = getEnv().MEDIA_URL_TTL_SECONDS
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = (Math.floor(now / ttl) + 2) * ttl // valid for between ttl and 2×ttl
  return cloudinary.utils.private_download_url(parsed.publicId, parsed.format, {
    type: parsed.type,
    resource_type: parsed.resourceType,
    expires_at: expiresAt,
  })
}

/** Prepare an item (mongoose doc or plain object) for the API response. */
export function presentItem(item) {
  if (!item) return item
  const out = typeof item.toJSON === 'function' ? item.toJSON() : { ...item }
  delete out.embedding
  delete out.tagIndex
  delete out.urlHash
  if (out.file) {
    out.file = { ...out.file }
    delete out.file.storageKey
    delete out.file.hashIndex
  }
  if (isMediaRef(out.thumbnailUrl)) out.thumbnailUrl = deliveryUrl(out.thumbnailUrl)
  return out
}

/** Legacy public Cloudinary URL → { publicId, type, resourceType } */
function parseLegacyUrl(url) {
  const m = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/(upload|authenticated|private)\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i.exec(url || '')
  return m ? { resourceType: m[1], type: m[2], publicId: m[3] } : null
}

/** Best-effort deletion of stored media (refs or legacy Cloudinary URLs). */
export async function destroyMedia(values = []) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return 0
  let deleted = 0
  for (const v of values) {
    const target = parseRef(v) || parseLegacyUrl(v)
    if (!target) continue
    try {
      await cloudinary.uploader.destroy(target.publicId, {
        type: target.type,
        resource_type: target.resourceType,
        invalidate: true,
      })
      deleted++
    } catch (err) {
      console.warn('[media] failed to delete asset:', err.message)
    }
  }
  return deleted
}

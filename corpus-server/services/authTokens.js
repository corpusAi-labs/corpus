import crypto from 'crypto'

/**
 * Secrets we must be able to verify but never need to read back are stored
 * only as hashes: a database leak must not yield working sessions or codes.
 */
export const MAX_SESSIONS = 10
export const MAX_OTP_ATTEMPTS = 5

// Refresh tokens are high-entropy JWTs, so a plain SHA-256 is sufficient.
export const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')

// OTPs are only 6 digits — use a keyed HMAC so a leaked hash can't be brute-forced offline.
export function hashOtp(email, otp) {
  return crypto.createHmac('sha256', process.env.REFRESH_SECRET).update(`otp|${email}|${otp}`).digest('hex')
}

export const generateOtp = () => crypto.randomInt(100000, 1000000).toString()

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

/** Session list helpers. Legacy rows may still hold raw tokens; accept and upgrade them. */
export function hasSession(user, token) {
  const list = user.refreshTokens || []
  return list.includes(hashToken(token)) || list.includes(token)
}

export function addSession(user, token) {
  user.refreshTokens = [...(user.refreshTokens || []), hashToken(token)].slice(-MAX_SESSIONS)
}

export function removeSession(user, token) {
  const h = hashToken(token)
  user.refreshTokens = (user.refreshTokens || []).filter(t => t !== h && t !== token)
}

export const ROTATION_GRACE_MS = 30 * 1000

/** Consume a token on refresh, remembering it briefly for concurrent requests. */
export function rotateSession(user, oldToken, newToken) {
  removeSession(user, oldToken)
  const now = Date.now()
  user.rotatedTokens = [
    ...(user.rotatedTokens || []).filter(r => now - new Date(r.at).getTime() < ROTATION_GRACE_MS),
    { hash: hashToken(oldToken), at: new Date(now) },
  ].slice(-MAX_SESSIONS)
  addSession(user, newToken)
}

export function wasJustRotated(user, token) {
  const h = hashToken(token)
  return (user.rotatedTokens || []).some(r => r.hash === h && Date.now() - new Date(r.at).getTime() < ROTATION_GRACE_MS)
}

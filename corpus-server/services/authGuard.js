import { getKv } from './redis.js'

/**
 * Account-level brute-force protection and instant token revocation.
 */

// ── Login lockout (per account, independent of IP) ────────────────────────
// Per-IP rate limits can't stop an attacker spreading guesses across many IPs;
// this counts failures per email. It applies to unknown emails too, so the
// response never reveals whether an account exists.
export const LOGIN_MAX_FAILURES = 5
export const LOGIN_WINDOW_MS = 15 * 60 * 1000
export const LOGIN_LOCK_MS = 15 * 60 * 1000

const failKey = email => `auth:fail:${email}`
const lockKey = email => `auth:lock:${email}`

/** ms until the account unlocks, or 0 if it isn't locked. */
export async function loginLockRemaining(email) {
  try {
    const ttl = await getKv().pttl(lockKey(email))
    return ttl > 0 ? ttl : 0
  } catch (err) {
    console.error('[authGuard] lock check failed (allowing):', err.message)
    return 0
  }
}

/** Record a failed login; returns true if this failure triggered a lock. */
export async function recordLoginFailure(email) {
  try {
    const kv = getKv()
    const n = await kv.incr(failKey(email), LOGIN_WINDOW_MS)
    if (n >= LOGIN_MAX_FAILURES) {
      await kv.set(lockKey(email), '1', LOGIN_LOCK_MS)
      await kv.del(failKey(email))
      return true
    }
  } catch (err) {
    console.error('[authGuard] could not record failure:', err.message)
  }
  return false
}

export async function clearLoginFailures(email) {
  await getKv().del(failKey(email)).catch(() => {})
}

// ── Access-token revocation ───────────────────────────────────────────────
// Access tokens are stateless JWTs (15 min). Two cheap checks make "log out"
// take effect immediately instead of when the token expires:
//   revoked:<jti>         — this one token (logout)
//   valid-after:<userId>  — every token issued before this time (sign out
//                           everywhere, password change, token theft, deletion)
// Both keys only need to live as long as an access token can.
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000

export async function revokeAccessToken(jti, expSeconds) {
  if (!jti) return
  const ttl = Math.max(1000, expSeconds * 1000 - Date.now())
  await getKv().set(`auth:revoked:${jti}`, '1', ttl).catch(err => console.error('[authGuard]', err.message))
}

export async function revokeAllAccessTokens(userId) {
  // Millisecond cut-off: everything issued before now dies, a sign-in a moment later works
  await getKv().set(`auth:valid-after:${userId}`, String(Date.now()), ACCESS_TOKEN_TTL_MS + 60000)
    .catch(err => console.error('[authGuard]', err.message))
}

/** Is this decoded access token still valid? (one round trip) */
export async function isAccessTokenRevoked({ id, jti, iat, iatMs }) {
  try {
    const [revoked, validAfter] = await getKv().mget([`auth:revoked:${jti}`, `auth:valid-after:${id}`])
    const issuedAt = iatMs ?? (iat + 1) * 1000 // tokens without iatMs: assume the latest ms of their second
    return !!revoked || (validAfter !== null && issuedAt <= Number(validAfter))
  } catch (err) {
    // Fail open: a Redis outage shouldn't log everyone out. Tokens still expire in ≤15 min.
    console.error('[authGuard] revocation check failed (allowing):', err.message)
    return false
  }
}

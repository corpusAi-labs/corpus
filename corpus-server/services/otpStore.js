import { getKv } from './redis.js'

/**
 * Pending one-time codes (signup verification, password setup).
 * Stored in Redis with an exact TTL; the attempt counter is a separate atomic
 * key so concurrent guesses can't race past the limit. Only the HMAC of the
 * code is stored, never the code itself.
 */
export const OTP_TTL_MS = 10 * 60 * 1000

const recKey = email => `otp:${email}`
const attemptsKey = email => `otp:attempts:${email}`

export async function saveOtp(email, { otpHash, name, passwordHash }) {
  const kv = getKv()
  await kv.del(attemptsKey(email))
  await kv.set(recKey(email), JSON.stringify({ otpHash, name, passwordHash, createdAt: Date.now() }), OTP_TTL_MS)
}

export async function getOtp(email) {
  const raw = await getKv().get(recKey(email))
  return raw ? JSON.parse(raw) : null
}

/** Atomically count a wrong guess; returns the new total. */
export const recordOtpFailure = email => getKv().incr(attemptsKey(email), OTP_TTL_MS)

export async function getOtpAttempts(email) {
  return Number((await getKv().get(attemptsKey(email))) || 0)
}

export async function deleteOtp(email) {
  await getKv().del(recKey(email), attemptsKey(email))
}

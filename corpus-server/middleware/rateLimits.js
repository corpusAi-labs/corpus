import { rateLimit as baseRateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { getRedisClient } from '../services/redis.js'
import { getEnv } from '../config/env.js'

/**
 * Layered rate limits. Keys are the authenticated user where available
 * (fair per account, works behind NAT), otherwise the client IP.
 *
 * With REDIS_URL the counters live in Redis, so limits hold across every
 * server instance (otherwise each instance would allow the full quota).
 * If Redis has a blip the limiter fails open — a Redis outage must not lock
 * every user out — and the per-account login lockout still applies.
 */
let limiterCount = 0
function rateLimit(options) {
  const redis = getRedisClient()
  const name = `rl${++limiterCount}`
  return baseRateLimit({
    ...options,
    passOnStoreError: true,
    ...(redis && {
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: `${getEnv().REDIS_KEY_PREFIX}${name}:`,
      }),
    }),
  })
}

const common = { standardHeaders: 'draft-7', legacyHeaders: false }
const ip = req => req.ip || 'unknown'
const userOrIp = req => (req.user?.id ? `u:${req.user.id}` : `ip:${ip(req)}`)
const message = msg => ({ error: msg })

// Credential guessing: login / signup / password setup
export const authLimiter = rateLimit({
  ...common, windowMs: 15 * 60 * 1000, limit: 20, keyGenerator: ip,
  message: message('Too many attempts. Please try again in a few minutes.'),
})

// OTP entry: per email + IP, on top of the per-code attempt counter
export const otpLimiter = rateLimit({
  ...common, windowMs: 15 * 60 * 1000, limit: 10,
  keyGenerator: req => `${ip(req)}|${String(req.body?.email || '').toLowerCase()}`,
  message: message('Too many verification attempts. Please try again later.'),
})

// Sending email costs money and can be abused to spam inboxes
export const emailLimiter = rateLimit({
  ...common, windowMs: 60 * 60 * 1000, limit: 5,
  keyGenerator: req => `${ip(req)}|${String(req.body?.email || '').toLowerCase()}`,
  message: message('Too many emails requested. Please try again later.'),
})

// Expensive or destructive account operations
export const sensitiveLimiter = rateLimit({
  ...common, windowMs: 60 * 60 * 1000, limit: 10, keyGenerator: userOrIp,
  message: message('Too many requests. Please try again later.'),
})

// Saving triggers scraping + LLM + embedding calls
export const createItemLimiter = rateLimit({
  ...common, windowMs: 60 * 1000, limit: 30, keyGenerator: userOrIp,
  message: message('You are saving too fast. Please slow down.'),
})

// Baseline for the whole API
export const apiLimiter = rateLimit({
  ...common, windowMs: 60 * 1000, limit: 300, keyGenerator: ip,
  message: message('Too many requests.'),
})

// File uploads: expensive to parse, store and process
export const uploadLimiter = rateLimit({
  ...common, windowMs: 60 * 60 * 1000, limit: 30, keyGenerator: userOrIp,
  message: message('Upload limit reached. Please try again later.'),
})

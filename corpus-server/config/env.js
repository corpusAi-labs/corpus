import { z } from 'zod'

/**
 * Single source of truth for configuration. Validated once at boot so a
 * misconfigured deploy fails loudly instead of failing on the first request.
 */
const base64Key = z
  .string()
  .refine(v => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64-encoded')

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5001),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    ACCESS_SECRET: z.string().min(1, 'ACCESS_SECRET is required'),
    REFRESH_SECRET: z.string().min(1, 'REFRESH_SECRET is required'),

    // ── Encryption / key management ──
    KEY_PROVIDER: z.enum(['local', 'gcp-kms']).default('local'),
    DATA_ENCRYPTION_KEY: base64Key.optional(), // local KEK (and legacy v1 key)
    DATA_ENCRYPTION_KEYS_RETIRED: z.string().optional(), // comma-separated old local KEKs, kept for unwrap during rotation
    GCP_KMS_KEY_NAME: z.string().optional(), // projects/<p>/locations/<l>/keyRings/<r>/cryptoKeys/<k>
    DEK_CACHE_TTL_SECONDS: z.coerce.number().default(300),

    // ── Privacy / retention ──
    AUDIT_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
    TRASH_RETENTION_DAYS: z.coerce.number().int().min(1).default(30),
    MEDIA_URL_TTL_SECONDS: z.coerce.number().int().min(60).default(3600),

    // ── Files & processing ──
    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).optional(), // default: cloudinary if configured, else local
    STORAGE_DIR: z.string().default('./storage'), // local driver only
    QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
    QUEUE_POLL_MS: z.coerce.number().int().min(100).default(2000),
    PDF_WORKER_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),
    PDF_WORKER_MEMORY_MB: z.coerce.number().int().min(64).default(512),

    // ── AI data routing ──
    // Providers approved to process PRIVATE content (notes, images, PDFs). Only list
    // providers you use under zero-retention / no-training terms (e.g. paid tiers).
    AI_PRIVATE_PROVIDERS: z.string().default('groq,gemini'),

    // ── Redis (rate limits, login lockout, OTPs, token revocation) ──
    REDIS_URL: z.string().optional(), // e.g. redis://localhost:6379 or rediss://… (TLS)
    REDIS_KEY_PREFIX: z.string().default('corpus:'),

    // ── Network ──
    TRUST_PROXY: z.coerce.number().int().min(0).default(0), // hops; set 1 behind Render/Railway/Heroku
    CORS_ORIGINS: z.string().optional(), // extra comma-separated origins
    EXTENSION_IDS: z.string().optional(), // comma-separated Chrome extension IDs allowed by CORS
  })
  .superRefine((env, ctx) => {
    for (const k of ['ACCESS_SECRET', 'REFRESH_SECRET']) {
      if (env[k] && env[k].length < 32) {
        if (env.NODE_ENV === 'production') {
          ctx.addIssue({ code: 'custom', path: [k], message: 'must be at least 32 characters in production' })
        } else {
          console.warn(`[env] ${k} is shorter than 32 characters — fine for dev, rejected in production`)
        }
      }
    }
    if (env.NODE_ENV === 'production' && !env.REDIS_URL) {
      console.warn('[env] REDIS_URL is not set — rate limits, login lockout and token revocation fall back to per-instance memory')
    }
    if (env.KEY_PROVIDER === 'local' && !env.DATA_ENCRYPTION_KEY) {
      ctx.addIssue({ code: 'custom', path: ['DATA_ENCRYPTION_KEY'], message: 'required when KEY_PROVIDER=local' })
    }
    if (env.KEY_PROVIDER === 'gcp-kms' && !env.GCP_KMS_KEY_NAME) {
      ctx.addIssue({ code: 'custom', path: ['GCP_KMS_KEY_NAME'], message: 'required when KEY_PROVIDER=gcp-kms' })
    }
  })

let cached = null

export function getEnv() {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Test helper: re-read process.env on next getEnv() call. */
export function resetEnvCache() {
  cached = null
}

export const csv = v => (v || '').split(',').map(s => s.trim()).filter(Boolean)

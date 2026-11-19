import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import passport from './config/passport.js'
import { getEnv, csv } from './config/env.js'
import { requestContextMiddleware } from './middleware/requestContext.js'
import { apiLimiter } from './middleware/rateLimits.js'
import mongoose from 'mongoose'
import { kvHealth } from './services/redis.js'
import authRoutes from './routes/auth.js'
import itemRoutes from './routes/items.js'
import uploadRoutes from './routes/upload.js'
import spaceRoutes from './routes/spaces.js'
import accountRoutes from './routes/account.js'

/**
 * Builds the Express app without side effects (no DB connect, no listen),
 * so it can be imported by tests and by the server entrypoint alike.
 */
export function createApp() {
  const env = getEnv()
  const app = express()
  app.disable('x-powered-by')
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY) // correct req.ip behind a load balancer

  // ── CORS: explicit allowlist ──
  const allowed = new Set([
    'https://corpus-kappa-one.vercel.app',
    env.CLIENT_URL,
    ...csv(env.CORS_ORIGINS),
    ...csv(env.EXTENSION_IDS).map(id => `chrome-extension://${id}`),
  ])
  const isDevOrigin = origin =>
    env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

  app.use(helmet({
    crossOriginOpenerPolicy: { policy: 'unsafe-none' }, // Google OAuth popup
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))
  app.use(cors({
    origin: (origin, cb) => {
      // No Origin header = same-origin, curl, or server-to-server: CORS doesn't apply
      if (!origin || allowed.has(origin) || isDevOrigin(origin)) return cb(null, true)
      if (env.NODE_ENV !== 'production' && origin.startsWith('chrome-extension://')) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  }))

  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use(passport.initialize())
  app.use(requestContextMiddleware)

  app.get('/api/health', (req, res) => {
    const kv = kvHealth()
    const db = mongoose.connection.readyState === 1 ? 'up' : 'down'
    const ok = db === 'up' && kv.status === 'ready'
    res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', service: 'corpus-server', db, cache: kv })
  })

  app.use('/api', apiLimiter)
  app.use('/api/auth', authRoutes)
  app.use('/api/items', itemRoutes)
  app.use('/api/upload', uploadRoutes)
  app.use('/api/spaces', spaceRoutes)
  app.use('/api/account', accountRoutes)

  // Uniform JSON errors; never leak stack traces
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || (err.type === 'entity.too.large' ? 413 : 500)
    if (status >= 500) console.error('[unhandled]', err)
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message })
  })

  return app
}

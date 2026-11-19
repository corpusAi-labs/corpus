import { createContext, runWithContext } from '../services/requestContext.js'
import { flushAccess } from '../services/audit.js'

export function requestContextMiddleware(req, res, next) {
  const incoming = req.get('x-request-id')
  const ctx = createContext({ ip: req.ip, userAgent: req.get('user-agent') })
  if (incoming && /^[\w-]{8,64}$/.test(incoming)) ctx.requestId = incoming
  res.setHeader('X-Request-Id', ctx.requestId)

  res.on('finish', () => {
    // route pattern (e.g. /api/items/:id) is only known after routing
    ctx.action = `${req.method} ${req.baseUrl}${req.route?.path === '/' ? '' : req.route?.path || ''}`
    flushAccess(ctx)
  })
  runWithContext(ctx, next)
}

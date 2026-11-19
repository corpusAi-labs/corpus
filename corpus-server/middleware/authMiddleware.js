import jwt from 'jsonwebtoken'
import { isAccessTokenRevoked } from '../services/authGuard.js'

export async function authMiddleware(req, res, next) {
    // 1. Read access token from httpOnly cookie (with fallback to Bearer header if needed for Chrome Extension)
  const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET)
    if (await isAccessTokenRevoked(decoded)) {
      return res.status(401).json({ error: 'Session ended. Please sign in again.' })
    }
    req.user = { id: decoded.id }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' })
    }
    return res.status(401).json({ error: 'Invalid token.' })
  }
}

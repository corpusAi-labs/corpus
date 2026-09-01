import { Router } from 'express'
import passport from '../config/passport.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,
  getMe,
  refresh,
  googleCallback,
  requestPasswordSetup,
  confirmPasswordSetup,
} from '../controllers/authController.js'

const router = Router()
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

router.post('/signup', signup)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/login', login)
router.post('/logout', logout)
router.post('/refresh', refresh)
router.post('/request-password-setup', requestPasswordSetup)
router.post('/confirm-password-setup', confirmPasswordSetup)
router.get('/me', authMiddleware, getMe)

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.',
    })
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, prompt: 'select_account' })(req, res, next)
})

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('[Google OAuth Error Detail]:', err)
        return res.redirect(`${CLIENT_URL}/login?error=google_failed`)
      }
      if (!user) {
        return res.redirect(`${CLIENT_URL}/login?error=google_failed`)
      }
      req.user = user
      next()
    })(req, res, next)
  },
  googleCallback
)

export default router

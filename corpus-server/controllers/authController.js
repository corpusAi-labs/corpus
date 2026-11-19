import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import { sendOtpEmail } from '../services/emailService.js'
import { randomUUID } from 'crypto'
import {
  hashOtp, generateOtp, safeEqual, hasSession, addSession, removeSession, rotateSession, wasJustRotated, MAX_OTP_ATTEMPTS,
} from '../services/authTokens.js'
import { auditEvent } from '../services/audit.js'
import { saveOtp, getOtp, deleteOtp, recordOtpFailure, getOtpAttempts } from '../services/otpStore.js'
import {
  loginLockRemaining, recordLoginFailure, clearLoginFailures, revokeAccessToken, revokeAllAccessTokens,
} from '../services/authGuard.js'

const isProd = process.env.NODE_ENV === 'production'

function generateAccessToken(userId) {
  // jti lets a single token be revoked on logout (see services/authGuard.js)
  // iatMs: millisecond issue time, so revocation cut-offs are exact (JWT `iat` is whole seconds)
  return jwt.sign({ id: userId, jti: randomUUID(), iatMs: Date.now() }, process.env.ACCESS_SECRET, { expiresIn: '15m' })
}

function setAccessTokenCookie(res, token){
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  })
}

function generateRefreshToken(userId) {
  // jti makes every token unique, so rotation can tell tokens apart
  return jwt.sign({ id: userId, jti: randomUUID() }, process.env.REFRESH_SECRET, { expiresIn: '7d' })
}

/**
 * Check a submitted OTP against the pending record for this email.
 * Returns null on success, or an [status, message] tuple on failure.
 * Wrong guesses are counted; after MAX_OTP_ATTEMPTS the code is burned.
 */
async function checkOtp(email, otp) {
  const record = await getOtp(email)
  if (!record) return [null, [400, 'Invalid or expired verification code.']]
  if ((await getOtpAttempts(email)) >= MAX_OTP_ATTEMPTS) {
    await deleteOtp(email)
    return [null, [429, 'Too many incorrect attempts. Please request a new code.']]
  }
  if (!safeEqual(record.otpHash, hashOtp(email, otp))) {
    await recordOtpFailure(email)
    return [null, [400, 'Invalid or expired verification code.']]
  }
  return [record, null]
}

function lockedResponse(res, ms) {
  const minutes = Math.ceil(ms / 60000)
  res.setHeader('Retry-After', Math.ceil(ms / 1000))
  return res.status(429).json({
    error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    code: 'ACCOUNT_LOCKED',
  })
}

function setRefreshTokenCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    credits: user.credits,
    plan: user.plan,
  }
}

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(80).trim(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export async function signup(req, res) {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
  const { name, email, password } = parsed.data
  try {
    const existing = await User.findOne({ email })
    if (existing) {
      if (!existing.passwordHash) {
        return res.status(400).json({
          requiresPasswordSetup: true,
          email: existing.email,
          error: 'An account with this email exists via Google, but has no password set. Please set a password for your account.',
        })
      }
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const otp = generateOtp()

    await saveOtp(email, { otpHash: hashOtp(email, otp), name, passwordHash })

    await sendOtpEmail(email, otp, name)

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
      email,
    })
  } catch (err) {
    console.error('[signup]', err.message)
    return res.status(500).json({ error: 'Signup failed. Please try again.' })
  }
}

const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().length(6, 'Verification code must be 6 digits').trim(),
})

export async function verifyOtp(req, res) {
  const parsed = verifyOtpSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid verification code format.' })
  const { email, otp } = parsed.data

  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' })

    const [otpRecord, otpError] = await checkOtp(email, otp)
    if (otpError) return res.status(otpError[0]).json({ error: otpError[1] })

    const user = await User.create({
      name: otpRecord.name,
      email: otpRecord.email,
      passwordHash: otpRecord.passwordHash,
      credits: 100,
      plan: 'free',
    })

    await deleteOtp(email)

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    addSession(user, refreshToken)
    await user.save()
    auditEvent(user._id, 'auth.signup', 'Account created', req)

    setRefreshTokenCookie(res, refreshToken)
    setAccessTokenCookie(res, accessToken)

    return res.status(201).json({
      success: true,
      user: formatUser(user),
    })
  } catch (err) {
    console.error('[verifyOtp]', err.message)
    return res.status(500).json({ error: 'Verification failed. Please try again.' })
  }
}

const resendOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export async function resendOtp(req, res) {
  const parsed = resendOtpSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email address.' })
  const { email } = parsed.data

  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' })

    const pending = await getOtp(email)
    if (!pending) {
      return res.status(400).json({ error: 'No pending registration found. Please fill in signup details again.' })
    }

    if (Date.now() - pending.createdAt < 60 * 1000) {
      return res.status(429).json({ error: 'Please wait a minute before requesting another code.' })
    }

    const newOtp = generateOtp()
    await saveOtp(email, { otpHash: hashOtp(email, newOtp), name: pending.name, passwordHash: pending.passwordHash })

    await sendOtpEmail(email, newOtp, pending.name)

    return res.json({
      success: true,
      message: 'A fresh verification code has been sent.',
    })
  } catch (err) {
    console.error('[resendOtp]', err.message)
    return res.status(500).json({ error: 'Failed to resend verification code.' })
  }
}

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
})

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email or password.' })
  const { email, password } = parsed.data
  try {
    // Per-account lockout (checked before any password hashing work)
    const lockedFor = await loginLockRemaining(email)
    if (lockedFor) return lockedResponse(res, lockedFor)

    const user = await User.findOne({ email })
    if (!user) {
      if (await recordLoginFailure(email)) return lockedResponse(res, 15 * 60 * 1000)
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // Check if user registered via Google and has no password set
    if (!user.passwordHash) {
      return res.status(400).json({
        requiresPasswordSetup: true,
        email: user.email,
        error: 'Your account was created via Google and has no password set. Please set a password for your account.',
      })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      auditEvent(user._id, 'auth.login_failed', 'Failed sign-in attempt (wrong password)', req)
      if (await recordLoginFailure(email)) {
        auditEvent(user._id, 'auth.locked', 'Sign-in locked for 15 minutes after repeated wrong passwords', req)
        return lockedResponse(res, 15 * 60 * 1000)
      }
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    await clearLoginFailures(email)

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    addSession(user, refreshToken)
    await user.save()
    auditEvent(user._id, 'auth.login', 'Signed in with password', req)

    setRefreshTokenCookie(res, refreshToken)
    setAccessTokenCookie(res, accessToken)

    return res.json({
      success: true,
      user: formatUser(user),
    })
  } catch (err) {
    console.error('[login]', err.message)
    return res.status(500).json({ error: 'Login failed.' })
  }
}

const requestPasswordSetupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export async function requestPasswordSetup(req, res) {
  const parsed = requestPasswordSetupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid email address.' })
  const { email } = parsed.data

  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'No account found with this email.' })

    const otp = generateOtp()

    await saveOtp(email, { otpHash: hashOtp(email, otp), name: user.name || 'User', passwordHash: 'SETUP_PASSWORD_PENDING' })

    await sendOtpEmail(email, otp, user.name)

    return res.status(200).json({
      success: true,
      message: 'Verification OTP code sent to your email.',
      email,
    })
  } catch (err) {
    console.error('[requestPasswordSetup]', err.message)
    return res.status(500).json({ error: 'Failed to send OTP code.' })
  }
}

const confirmPasswordSetupSchema = z
  .object({
    email: z.string().email().toLowerCase().trim(),
    otp: z.string().length(6, 'Verification code must be 6 digits').trim(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export async function confirmPasswordSetup(req, res) {
  const parsed = confirmPasswordSetupSchema.safeParse(req.body)
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Invalid input.'
    return res.status(400).json({ error: firstError })
  }
  const { email, otp, password } = parsed.data

  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const [, otpError] = await checkOtp(email, otp)
    if (otpError) return res.status(otpError[0]).json({ error: otpError[1] })

    const passwordHash = await bcrypt.hash(password, 12)
    user.passwordHash = passwordHash
    user.refreshTokens = [] // credential change: sign out every existing session
    await user.save()
    await revokeAllAccessTokens(user._id)
    await clearLoginFailures(email)
    auditEvent(user._id, 'auth.password_set', 'Password set — all other sessions signed out', req)

    await deleteOtp(email)

    return res.status(200).json({
      success: true,
      message: 'Password created successfully! Please sign in with your new password.',
    })
  } catch (err) {
    console.error('[confirmPasswordSetup]', err.message)
    return res.status(500).json({ error: 'Failed to set password.' })
  }
}

export async function logout(req, res) {
  // Kill the current access token now, not when it expires
  const accessToken = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1]
  if (accessToken) {
    try {
      const { jti, exp } = jwt.verify(accessToken, process.env.ACCESS_SECRET, { ignoreExpiration: true })
      await revokeAccessToken(jti, exp)
    } catch { /* invalid token: nothing to revoke */ }
  }

  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token']
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET)
      const user = await User.findById(decoded.id)
      if (user) {
        removeSession(user, refreshToken)
        await user.save()
        auditEvent(user._id, 'auth.logout', 'Signed out', req)
      }
    } catch (err) {
      console.warn('[logout] token verification or database pull failed:', err.message)
    }
  }
  
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  })
  
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  })

  return res.json({ success: true })
}

export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash -refreshTokens')
    if (!user) return res.status(404).json({ error: 'User not found.' })
    return res.json({ user: formatUser(user) })
  } catch {
    return res.status(500).json({ error: 'Failed to fetch user.' })
  }
}

export async function refresh(req, res) {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token']
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found.' })
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ error: 'Invalid or revoked refresh token.' })

    const concurrent = !hasSession(user, refreshToken) && wasJustRotated(user, refreshToken)
    if (!hasSession(user, refreshToken) && !concurrent) {
      // A validly-signed token that was already rotated away is being replayed:
      // assume it was stolen and revoke every session for this user.
      user.refreshTokens = []
      await user.save()
      await revokeAllAccessTokens(user._id) // the thief's access token dies too
      auditEvent(user._id, 'auth.token_reuse', 'Reused session token detected — all sessions signed out', req)
      return res.status(401).json({ error: 'Invalid or revoked refresh token.' })
    }

    const accessToken = generateAccessToken(user._id)
    const newRefreshToken = generateRefreshToken(user._id)

    // Rotate: the presented token is consumed and replaced. A second tab racing
    // with an already-rotated token just gets a fresh session of its own.
    if (concurrent) addSession(user, newRefreshToken)
    else rotateSession(user, refreshToken, newRefreshToken)
    await user.save()

    setRefreshTokenCookie(res, newRefreshToken)
    setAccessTokenCookie(res, accessToken)

    return res.json({
      success: true,
      user: formatUser(user),
    })
  } catch (err) {
    console.warn('[refresh] token verification failed:', err.message)
    return res.status(401).json({ error: 'Invalid or expired refresh token.' })
  }
}


export async function googleCallback(req, res) {
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
  try {
    const user = req.user
    if (!user) {
      console.error('[googleCallback] No user on req after passport auth')
      return res.redirect(`${CLIENT_URL}/login?error=google_failed`)
    }

    console.log('[googleCallback] User authenticated:', user.email)

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    addSession(user, refreshToken)
    await user.save()
    auditEvent(user._id, 'auth.login', 'Signed in with Google', req)

    // 1. Set httpOnly cookies for both tokens
    setRefreshTokenCookie(res, refreshToken)
    setAccessTokenCookie(res, accessToken)

    // 2. Redirect directly to frontend dashboard
    console.log('[googleCallback] Redirecting to:', `${CLIENT_URL}/dashboard`)
    return res.redirect(`${CLIENT_URL}/dashboard`)

  } catch (err) {
    console.error('[googleCallback] Error:', err.message)
    return res.redirect(`${CLIENT_URL}/login?error=google_failed`)
  }
}

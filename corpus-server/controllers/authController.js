import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'
import Otp from '../models/Otp.js'
import { sendOtpEmail } from '../services/emailService.js'

const isProd = process.env.NODE_ENV === 'production'

function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.ACCESS_SECRET, { expiresIn: '15m' })
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.REFRESH_SECRET, { expiresIn: '30d' })
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    await Otp.deleteMany({ email })
    await Otp.create({
      email,
      otp,
      name,
      passwordHash,
    })

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

    const otpRecord = await Otp.findOne({ email, otp })
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' })
    }

    const user = await User.create({
      name: otpRecord.name,
      email: otpRecord.email,
      passwordHash: otpRecord.passwordHash,
      credits: 100,
      plan: 'free',
    })

    // Clean up OTP record
    await Otp.deleteMany({ email })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    user.refreshTokens = user.refreshTokens || []
    user.refreshTokens.push(refreshToken)
    await user.save()

    setRefreshTokenCookie(res, refreshToken)

    return res.status(201).json({
      token: accessToken,
      refreshToken,
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

    const pending = await Otp.findOne({ email })
    if (!pending) {
      return res.status(400).json({ error: 'No pending registration found. Please fill in signup details again.' })
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString()
    pending.otp = newOtp
    pending.createdAt = new Date()
    await pending.save()

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
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' })

    // Check if user registered via Google and has no password set
    if (!user.passwordHash) {
      return res.status(400).json({
        requiresPasswordSetup: true,
        email: user.email,
        error: 'Your account was created via Google and has no password set. Please set a password for your account.',
      })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    user.refreshTokens = user.refreshTokens || []
    user.refreshTokens.push(refreshToken)
    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10)
    }
    await user.save()

    setRefreshTokenCookie(res, refreshToken)

    return res.json({
      token: accessToken,
      refreshToken,
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    await Otp.deleteMany({ email })
    await Otp.create({
      email,
      otp,
      name: user.name || 'User',
      passwordHash: 'SETUP_PASSWORD_PENDING',
    })

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

    const otpRecord = await Otp.findOne({ email, otp })
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    user.passwordHash = passwordHash
    await user.save()

    // Clean up OTP record
    await Otp.deleteMany({ email })

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
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token']
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET)
      await User.findByIdAndUpdate(decoded.id, { $pull: { refreshTokens: refreshToken } })
    } catch (err) {
      console.warn('[logout] token verification or database pull failed:', err.message)
    }
  }

  res.clearCookie('refreshToken', {
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
    if (!user || !user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token.' })
    }

    const accessToken = generateAccessToken(user._id)
    const newRefreshToken = generateRefreshToken(user._id)

    // Rotate refresh token: add new token, keep up to 20 recent active tokens
    user.refreshTokens = user.refreshTokens || []
    if (!user.refreshTokens.includes(newRefreshToken)) {
      user.refreshTokens.push(newRefreshToken)
    }
    if (user.refreshTokens.length > 20) {
      user.refreshTokens = user.refreshTokens.slice(-20)
    }
    await user.save()

    setRefreshTokenCookie(res, newRefreshToken)

    return res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
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

    user.refreshTokens = user.refreshTokens || []
    user.refreshTokens.push(refreshToken)
    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10)
    }
    await user.save()

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken)

    const formattedUser = formatUser(user)
    const payload = encodeURIComponent(JSON.stringify({ token: accessToken, refreshToken, user: formattedUser }))

    // Redirect directly to frontend callback page — works in popup AND same tab
    console.log('[googleCallback] Redirecting to:', `${CLIENT_URL}/auth/callback`)
    return res.redirect(`${CLIENT_URL}/auth/callback?data=${payload}`)
  } catch (err) {
    console.error('[googleCallback] Error:', err.message)
    return res.redirect(`${CLIENT_URL}/login?error=google_failed`)
  }
}

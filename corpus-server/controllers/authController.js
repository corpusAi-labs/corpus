import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'

const isProd = process.env.NODE_ENV === 'production'

function generateAccessToken(userId) {
  return jwt.sign({ id: userId }, process.env.ACCESS_SECRET, { expiresIn: '15m' })
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' })
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
    credits: user.credits,
    plan: user.plan,
  }
}

const signupSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6),
})

export async function signup(req, res) {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
  const { name, email, password } = parsed.data
  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash, credits: 100, plan: 'free' })

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    user.refreshTokens = user.refreshTokens || []
    user.refreshTokens.push(refreshToken)
    await user.save()

    setRefreshTokenCookie(res, refreshToken)

    return res.status(201).json({
      token: accessToken,
      user: formatUser(user),
    })
  } catch (err) {
    console.error('[signup]', err.message)
    return res.status(500).json({ error: 'Signup failed.' })
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
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password.' })
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
      user: formatUser(user),
    })
  } catch (err) {
    console.error('[login]', err.message)
    return res.status(500).json({ error: 'Login failed.' })
  }
}

export async function logout(req, res) {
  const refreshToken = req.cookies.refreshToken
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
  const refreshToken = req.cookies.refreshToken
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

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken)
    user.refreshTokens.push(newRefreshToken)
    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10)
    }
    await user.save()

    setRefreshTokenCookie(res, newRefreshToken)

    return res.json({
      token: accessToken,
      user: formatUser(user),
    })
  } catch (err) {
    console.warn('[refresh] token verification failed:', err.message)
    return res.status(401).json({ error: 'Invalid or expired refresh token.' })
  }
}

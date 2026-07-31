import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'

// Single token that lasts 30 days — user stays logged in without re-login
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.ACCESS_SECRET, { expiresIn: '30d' })
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
    const token = generateToken(user._id)
    return res.status(201).json({
      token,
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
    const token = generateToken(user._id)
    return res.json({
      token,
      user: formatUser(user),
    })
  } catch (err) {
    console.error('[login]', err.message)
    return res.status(500).json({ error: 'Login failed.' })
  }
}

export async function logout(req, res) {
  // Client clears the token from localStorage — nothing to do on server
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

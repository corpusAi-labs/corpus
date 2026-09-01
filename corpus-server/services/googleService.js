import User from '../models/User.js'
import { sendWelcomeEmail } from './emailService.js'

export const findOrCreateGoogleAccount = async (profile) => {
  // 1. Already have this Google account
  let user = await User.findOne({ googleId: profile.id })
  if (user) {
    user.avatar = profile.photos?.[0]?.value || user.avatar
    user.name = profile.displayName || user.name
    await user.save()
    return user
  }

  // 2. Email exists but without Google — link account
  const email = profile.emails?.[0]?.value
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() })
    if (user) {
      user.googleId = profile.id
      user.avatar = profile.photos?.[0]?.value || user.avatar
      await user.save()
      return user
    }
  }

  // 3. Brand new user
  user = await User.create({
    googleId: profile.id,
    name: profile.displayName || 'Google User',
    email: email ? email.toLowerCase() : `google_${profile.id}@corpus.app`,
    avatar: profile.photos?.[0]?.value || null,
    credits: 100,
    plan: 'free',
  })

  if (email) {
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('[Google OAuth] Welcome email failed:', err.message)
    })
  }

  return user
}

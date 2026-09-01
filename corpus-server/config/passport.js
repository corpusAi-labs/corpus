import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { findOrCreateGoogleAccount } from '../services/googleService.js'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Relative URL: passport-oauth2 builds the full URL from the incoming request
      // Works automatically on localhost AND production without any extra env var
      callbackURL: '/api/auth/google/callback',
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateGoogleAccount(profile)
        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

export default passport

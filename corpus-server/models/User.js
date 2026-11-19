
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    refreshTokens: [{ type: String }], // SHA-256 hashes of active refresh tokens
    // Tokens rotated in the last few seconds — lets concurrent tabs refresh without tripping reuse detection
    rotatedTokens: [{ _id: false, hash: String, at: Date }],
    credits: { type: Number, default: 100 },
    storageBytes: { type: Number, default: 0 }, // uploaded file bytes, counted against the plan quota
    plan: { type: String, enum: ['free', 'beginner', 'pro', 'max'], default: 'free' },
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)

import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    refreshTokens: [{ type: String }],
    credits: { type: Number, default: 100 },
    plan: { type: String, enum: ['free', 'beginner', 'pro', 'max'], default: 'free' },
  },
  { timestamps: true }
)

export default mongoose.model('User', userSchema)
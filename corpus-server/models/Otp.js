import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otpHash: {
    type: String, // HMAC of the code — the code itself is never stored
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Document expires and is automatically deleted after 10 minutes (600 seconds)
  },
})

export default mongoose.model('Otp', otpSchema)

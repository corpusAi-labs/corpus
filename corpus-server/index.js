import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import passport from './config/passport.js'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import itemRoutes from './routes/items.js'
import uploadRoutes from './routes/upload.js'
import spaceRoutes from './routes/spaces.js'

const app = express()
const PORT = process.env.PORT || 5001

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://corpus-kappa-one.vercel.app',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
]

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(
  cors({
    origin: (origin, callback) => {
      // allow no-origin requests (curl, Chrome extension), localhost on any port, local IPs, and known origins
      if (
        !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://172.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('chrome-extension://')
      ) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'corpus-server' })
})

app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/spaces', spaceRoutes)

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`[server] running on http://localhost:${PORT}`)
    console.log(`[server] NODE_ENV=${process.env.NODE_ENV || 'not set'}`)
    console.log(`[server] GROQ_API_KEY is ${process.env.GROQ_API_KEY ? 'SET (' + process.env.GROQ_API_KEY.slice(0, 8) + '...)' : 'MISSING — AI tagging will not work'}`)
    console.log(`[server] GOOGLE_CLIENT_ID is ${process.env.GOOGLE_CLIENT_ID ? 'SET (' + process.env.GOOGLE_CLIENT_ID.slice(0, 12) + '...)' : 'MISSING'}`)
    console.log(`[server] GOOGLE_CLIENT_SECRET is ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING'}`)
  })
}

start()

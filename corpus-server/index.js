import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
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
]

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      // allow no-origin requests (curl, Chrome extension) and known origins
      if (
        !origin ||
        ALLOWED_ORIGINS.includes(origin) ||
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
  })
}

start()

import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { uploadBuffer } from '../services/cloudinary.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'))
    }
    cb(null, true)
  },
})


router.use(authMiddleware)

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(503).json({
      error: 'Image upload not configured. Add Cloudinary keys to .env.',
    })
  }
  try {
    const url = await uploadBuffer(req.file.buffer)
    return res.json({ url })
  } catch (err) {
    console.error('[upload]', err.message)
    return res.status(500).json({ error: 'Upload failed' })
  }
})

export default router

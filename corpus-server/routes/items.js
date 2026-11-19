import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import multer from 'multer'
import { createItemLimiter, uploadLimiter } from '../middleware/rateLimits.js'
import { uploadPdf, getItemFile, getItemText } from '../controllers/pdfController.js'
import { ABSOLUTE_MAX_PDF_BYTES } from '../config/plans.js'
import {
  createItem, listItems, getItem, updateItem, deleteItem, driftItems, retryAI, listAllTags
} from '../controllers/itemController.js'
import { smartSearch } from '../controllers/searchController.js'

const router = Router()
router.use(authMiddleware)

// PDFs: buffered in memory (bounded by the largest plan limit), validated by content, not by name
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ABSOLUTE_MAX_PDF_BYTES, files: 1, fields: 5 },
  fileFilter: (req, file, cb) =>
    cb(null, ['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(file.mimetype)),
})
const receivePdf = (req, res, next) =>
  pdfUpload.single('file')(req, res, err => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'This PDF is larger than any plan allows.', code: 'FILE_TOO_LARGE' })
    if (err) return res.status(400).json({ error: 'Upload failed: ' + err.message })
    next()
  })

router.post('/pdf', uploadLimiter, receivePdf, uploadPdf)
router.get('/search', smartSearch)
router.get('/drift', driftItems)
router.get('/tags', listAllTags)
router.get('/', listItems)
router.post('/', createItemLimiter, createItem)
router.get('/:id', getItem)
router.get('/:id/file', getItemFile)
router.get('/:id/text', getItemText)
router.patch('/:id', updateItem)
router.post('/:id/retry-ai', createItemLimiter, retryAI)
router.delete('/:id', deleteItem)

export default router

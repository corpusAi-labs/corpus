import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { signup, login, logout, getMe, refresh } from '../controllers/authController.js'

const router = Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/logout', logout)
router.post('/refresh', refresh)
router.get('/me', authMiddleware, getMe)

export default router

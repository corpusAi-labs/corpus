import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { sensitiveLimiter } from '../middleware/rateLimits.js'
import {
  listAccessLog, downloadAccessLog, exportData, signOutEverywhere, deleteAccount,
} from '../controllers/accountController.js'

const router = Router()
router.use(authMiddleware)

router.get('/access-log', listAccessLog)
router.get('/access-log/download', downloadAccessLog)
router.get('/export', sensitiveLimiter, exportData)
router.post('/sign-out-everywhere', signOutEverywhere)
router.delete('/', sensitiveLimiter, deleteAccount)

export default router

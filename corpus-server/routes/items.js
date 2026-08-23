import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  createItem, listItems, getItem, updateItem, deleteItem, driftItems, retryAI, listAllTags
} from '../controllers/itemController.js'
import { smartSearch } from '../controllers/searchController.js'

const router = Router()
router.use(authMiddleware)

router.get('/search', smartSearch)
router.get('/drift', driftItems)
router.get('/tags', listAllTags)
router.get('/', listItems)
router.post('/', createItem)
router.get('/:id', getItem)
router.patch('/:id', updateItem)
router.post('/:id/retry-ai', retryAI)
router.delete('/:id', deleteItem)

export default router

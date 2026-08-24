import { z } from 'zod'
import Space from '../models/Space.js'
import Item from '../models/Item.js'

const createSpaceSchema = z.object({
  name: z.string().min(1).max(60).trim(),
  color: z.string().optional(),
})

export async function createSpace(req, res) {
  const parsed = createSpaceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() })
  }
  try {
    const space = await Space.create({
      userId: req.user.id,
      name: parsed.data.name,
      color: parsed.data.color || '#2E5BFF',
    })
    return res.status(201).json({ space })
  } catch (err) {
    console.error('[createSpace]', err.message)
    return res.status(500).json({ error: 'Failed to create space' })
  }
}

export async function listSpaces(req, res) {
  try {
    const spaces = await Space.find({ userId: req.user.id }).sort({ createdAt: -1 })

    const withMeta = await Promise.all(
      spaces.map(async (space) => {
        const count = await Item.countDocuments({
          userId: req.user.id,
          spaceId: space._id,
          deletedAt: null,
          archived: false,
        })

        return {
          ...space.toObject(),
          itemCount: count,
        }
      })
    )

    return res.json({ spaces: withMeta })
  } catch (err) {
    console.error('[listSpaces]', err.message)
    return res.status(500).json({ error: 'Failed to fetch spaces' })
  }
}

export async function getSpace(req, res) {
  try {
    const space = await Space.findOne({ _id: req.params.id, userId: req.user.id })
    if (!space) return res.status(404).json({ error: 'Space not found' })
    return res.json({ space })
  } catch {
    return res.status(400).json({ error: 'Invalid space id' })
  }
}

export async function updateSpace(req, res) {
  const allowedFields = ['name', 'color']
  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field]
  }
  try {
    const space = await Space.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    )
    if (!space) return res.status(404).json({ error: 'Space not found' })
    return res.json({ space })
  } catch {
    return res.status(400).json({ error: 'Invalid update' })
  }
}

export async function deleteSpace(req, res) {
  try {
    const space = await Space.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!space) return res.status(404).json({ error: 'Space not found' })

    // unassign items from this space rather than deleting them
    await Item.updateMany(
      { userId: req.user.id, spaceId: space._id },
      { spaceId: null }
    )

    return res.json({ success: true })
  } catch {
    return res.status(400).json({ error: 'Invalid space id' })
  }
}

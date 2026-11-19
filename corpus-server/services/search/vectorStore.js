import mongoose from 'mongoose'

/**
 * Vector similarity search with two interchangeable backends:
 *
 *   atlas — MongoDB Atlas `$vectorSearch` (ANN index; scales to millions)
 *   app   — exact cosine similarity in Node over the user's own vectors
 *           (no index needed; works on any MongoDB, fine for per-user volumes)
 *
 * VECTOR_SEARCH_BACKEND=auto (default) tries Atlas and permanently switches to
 * the in-app engine the first time Atlas reports $vectorSearch is unavailable,
 * so local development and self-hosted MongoDB still get real semantic search.
 *
 * Scores use Atlas's cosine convention, (1 + cos) / 2 ∈ [0, 1], so ranking
 * thresholds behave the same on both backends.
 */
const MAX_APP_CANDIDATES = 20000
let atlasUnavailable = false

const backend = () => {
  const b = (process.env.VECTOR_SEARCH_BACKEND || 'auto').toLowerCase()
  if (b === 'atlas' || b === 'app') return b
  return atlasUnavailable ? 'app' : 'auto'
}

const isUnsupported = err =>
  /vectorSearch|requires additional configuration|Unrecognized pipeline stage|search index/i.test(err?.message || '')

function cosineScore(q, qNorm, v) {
  let dot = 0
  let vNorm = 0
  for (let i = 0; i < q.length; i++) {
    dot += q[i] * v[i]
    vNorm += v[i] * v[i]
  }
  if (!vNorm || !qNorm) return 0
  return (1 + dot / (qNorm * Math.sqrt(vNorm))) / 2
}

function withScore(project) {
  const inclusive = Object.values(project).some(v => v === 1 || v === true)
  return inclusive ? { ...project, score: 1 } : project
}

async function atlasQuery(Model, { indexName, userId, queryVector, k, filter, project }) {
  return Model.aggregate([
    {
      $vectorSearch: {
        index: indexName,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(k * 10, 100),
        limit: k,
        filter: { userId },
      },
    },
    ...(filter ? [{ $match: filter }] : []),
    { $addFields: { score: { $meta: 'vectorSearchScore' } } },
    { $project: withScore(project) },
  ])
}

async function appQuery(Model, { userId, queryVector, k, filter, project }) {
  // Raw driver: read only ids + vectors (no decryption, minimal transfer)
  const docs = await Model.collection
    .find({ userId, 'embedding.0': { $exists: true }, ...(filter || {}) }, { projection: { embedding: 1 } })
    .limit(MAX_APP_CANDIDATES)
    .toArray()
  if (!docs.length) return []

  const qNorm = Math.sqrt(queryVector.reduce((s, x) => s + x * x, 0))
  const top = docs
    .map(d => ({ _id: d._id, score: cosineScore(queryVector, qNorm, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
  const scoreById = new Map(top.map(t => [String(t._id), t.score]))

  // Hydrate through Mongoose so the encryption plugin decrypts (and logs access)
  const hydrated = await Model.aggregate([{ $match: { _id: { $in: top.map(t => t._id) } } }, { $project: project }])
  return hydrated
    .map(d => ({ ...d, score: scoreById.get(String(d._id)) }))
    .sort((a, b) => b.score - a.score)
}

/**
 * k-nearest documents to `queryVector` among one user's documents.
 * `filter` is an extra MongoDB match on stored (not decrypted) fields.
 */
export async function vectorQuery(Model, { indexName, userId, queryVector, k = 30, filter, project }) {
  const args = { indexName, userId: new mongoose.Types.ObjectId(String(userId)), queryVector, k, filter, project }
  const mode = backend()

  if (mode !== 'app') {
    try {
      return await atlasQuery(Model, args)
    } catch (err) {
      if (mode === 'atlas' || !isUnsupported(err)) throw err
      atlasUnavailable = true
      console.warn('[vector] Atlas $vectorSearch unavailable — using the in-app vector engine from now on')
    }
  }
  return appQuery(Model, args)
}

export const vectorBackendInUse = () => (backend() === 'app' ? 'app' : 'atlas')

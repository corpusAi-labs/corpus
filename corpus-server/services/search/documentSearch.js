import mongoose from 'mongoose'
import Item from '../../models/Item.js'
import ItemChunk from '../../models/ItemChunk.js'
import { getUserCipher } from '../crypto.js'
import { prefixKeys, queryTerms, queryKey, normalizeText } from './tokenize.js'
import { vectorQuery } from './vectorStore.js'

/**
 * Search inside documents (PDF pages), returning the owning items with the
 * best-matching page and a snippet.
 */
const MAX_CHUNK_CANDIDATES = 300
// (1 + cos) / 2 — unrelated text sits around 0.72–0.76 with gemini-embedding-001
const MIN_CHUNK_SCORE = 0.79
// Short lead-in so the matched word survives a 2-line clamp on the card
const SNIPPET_BEFORE = 30
const SNIPPET_AFTER = 160

/** Best anchor for a snippet: the whole phrase if present, else the rarest matching term. */
export function findAnchor(text, terms, phrase = '') {
  const lower = text.toLowerCase()
  const p = phrase.trim().toLowerCase()
  if (p && lower.includes(p)) return lower.indexOf(p)
  let best = -1
  let bestCount = Infinity
  for (const t of terms) {
    const first = lower.indexOf(t)
    if (first === -1) continue
    const count = lower.split(t).length - 1
    if (count < bestCount) { best = first; bestCount = count }
  }
  return best === -1 ? 0 : best
}

/** Page number of a character offset inside a chunk. */
export const pageAt = (chunk, offset) =>
  (chunk.pageStart || 1) + (chunk.pageOffsets || []).filter(o => o <= offset).length

export function makeSnippet(text, terms, at = findAnchor(text, terms)) {
  let start = Math.max(0, at - SNIPPET_BEFORE)
  let end = Math.min(text.length, at + SNIPPET_AFTER)
  if (start > 0) start = text.indexOf(' ', start) + 1 || start
  if (end < text.length) end = text.lastIndexOf(' ', end) > at ? text.lastIndexOf(' ', end) : end
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`
}

const countOccurrences = (text, terms) => {
  const lower = text.toLowerCase()
  let n = 0
  for (const t of terms) for (let i = lower.indexOf(t); i !== -1; i = lower.indexOf(t, i + t.length)) n++
  return n
}

/** Group chunk hits per item, keep the best chunk, load the (filtered) items. */
async function itemsForChunks(scoredChunks, itemFilter) {
  const best = new Map()
  for (const s of scoredChunks) {
    const id = String(s.chunk.itemId)
    if (!best.has(id) || best.get(id).score < s.score) best.set(id, s)
  }
  if (!best.size) return []
  const items = await Item.find({ ...itemFilter, _id: { $in: [...best.keys()] } })
  return items.map(item => ({ item, ...best.get(String(item._id)) }))
}

// 12-byte truncated HMACs: candidates are always verified against the
// decrypted text, so rare collisions cost nothing and the index stays small.
const INDEX_CTX = 'ItemChunk.prefix'
const hashKey = (cipher, key) => cipher.blindIndex(key, INDEX_CTX).slice(0, 16)

/** Encrypted prefix index for a chunk of text (see tokenize.prefixKeys). */
export const chunkIndexHashes = (cipher, text) => prefixKeys(text).map(k => hashKey(cipher, k))

/**
 * Keyword search over the encrypted inverted index. Query word prefixes are
 * hashed with the user's index key and matched against `tokenIndex` — MongoDB
 * never sees a word, and the lookup is index-backed (no scanning). Candidates
 * are then confirmed against the decrypted text, so partial words work while
 * typing ("insur" → "insurance") and false positives are dropped.
 */
export async function searchDocumentsByKeyword({ userId, q, itemFilter }) {
  const terms = queryTerms(q)
  if (!terms.length) return []
  const cipher = await getUserCipher(userId)
  const hashes = [...new Set(terms.map(t => hashKey(cipher, queryKey(t))))]

  const contains = (chunk, t) => normalizeText(chunk.text).includes(t)
  let chunks = (await ItemChunk.find({ userId, tokenIndex: { $all: hashes } }).limit(MAX_CHUNK_CANDIDATES))
    .filter(c => terms.every(t => contains(c, t)))
  if (!chunks.length && terms.length > 1) {
    chunks = (await ItemChunk.find({ userId, tokenIndex: { $in: hashes } }).limit(MAX_CHUNK_CANDIDATES))
      .filter(c => terms.some(t => contains(c, t)))
  }

  const scored = chunks.map(chunk => {
    const occurrences = countOccurrences(chunk.text, terms)
    const at = findAnchor(chunk.text, terms, q)
    const page = pageAt(chunk, at)
    return {
      chunk,
      score: Math.min(30, 3 * occurrences) + (chunk.text.toLowerCase().includes(q.trim().toLowerCase()) ? 10 : 0),
      match: { pageStart: page, pageEnd: page, snippet: makeSnippet(chunk.text, terms, at), terms },
    }
  })
  return itemsForChunks(scored, itemFilter)
}

/**
 * Semantic search over chunk embeddings (Atlas Vector Search index
 * `chunk_vector_index` — see scripts/createSearchIndexes.js).
 */
export async function searchDocumentsByVector({ userId, queryVector, itemFilter, limit = 40, q = '' }) {
  const raw = await vectorQuery(ItemChunk, {
    indexName: 'chunk_vector_index',
    userId,
    queryVector,
    k: limit * 3,
    project: { userId: 1, itemId: 1, pageStart: 1, pageEnd: 1, pageOffsets: 1, text: 1 },
  })
  if (!raw.length) return []
  const top = raw[0].score
  const scored = raw
    .filter(c => c.score >= Math.max(MIN_CHUNK_SCORE, top - 0.08))
    .map(chunk => ({
      chunk,
      score: chunk.score,
      // Semantic hit: anchor on a query word if the chunk happens to contain one
      ...(() => {
        const terms = queryTerms(q)
        const at = findAnchor(chunk.text, terms, q)
        const page = pageAt(chunk, at)
        return { match: { pageStart: page, pageEnd: page, snippet: makeSnippet(chunk.text, terms, at), terms, semantic: true } }
      })(),
    }))
  return itemsForChunks(scored, itemFilter)
}

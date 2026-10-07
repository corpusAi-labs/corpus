import { GoogleGenerativeAI } from '@google/generative-ai'

const EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 768
const MAX_TEXT_LENGTH = 8000

let genAIClient = null

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('[embedding] GEMINI_API_KEY is not defined in environment variables')
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenerativeAI(apiKey)
  }
  return genAIClient
}

/**
 * Builds rich, high-signal semantic text representation from an item document.
 * Combines title, tags, content type, summary, personal notes, and content.
 */
export function buildItemEmbeddingText(item) {
  if (!item) return ''

  const parts = []

  if (item.title?.trim()) {
    parts.push(`Title: ${item.title.trim()}`)
  }

  if (item.contentType?.trim()) {
    parts.push(`Type: ${item.contentType.trim()}`)
  }

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    const validTags = item.tags.filter(t => typeof t === 'string' && t.trim())
    if (validTags.length > 0) {
      parts.push(`Tags: ${validTags.join(', ')}`)
    }
  }

  if (item.summary?.trim()) {
    parts.push(`Summary: ${item.summary.trim()}`)
  }

  if (item.note?.trim()) {
    parts.push(`Note: ${item.note.trim()}`)
  }

  if (item.content?.trim()) {
    parts.push(`Content: ${item.content.trim()}`)
  }

  // Fallback to url if nothing else is present
  if (parts.length === 0 && item.url?.trim()) {
    parts.push(`URL: ${item.url.trim()}`)
  }

  return parts.join('\n\n').slice(0, MAX_TEXT_LENGTH)
}

/**
 * Generates a 768-dimensional vector embedding for a given text string.
 * Supports taskType: 'RETRIEVAL_DOCUMENT' (for indexing) and 'RETRIEVAL_QUERY' (for searching).
 * Retries once on transient network errors.
 * Returns null if input is empty or API fails.
 */
export async function generateEmbedding(text, taskType = 'RETRIEVAL_DOCUMENT', maxRetries = 1) {
  if (!text || typeof text !== 'string') return null
  const sanitized = text.trim().slice(0, MAX_TEXT_LENGTH)
  if (!sanitized) return null

  let attempts = 0
  while (attempts <= maxRetries) {
    try {
      const client = getClient()
      const model = client.getGenerativeModel({ model: EMBEDDING_MODEL })
      const payload = {
        content: { parts: [{ text: sanitized }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }
      if (taskType) {
        payload.taskType = taskType
      }

      const result = await model.embedContent(payload)
      const values = result?.embedding?.values
      if (Array.isArray(values) && values.length === EMBEDDING_DIMENSIONS) {
        return values
      }

      console.warn(`[embedding] Unexpected embedding dimensionality: ${values?.length}, expected ${EMBEDDING_DIMENSIONS}`)
      return null
    } catch (err) {
      attempts++
      console.warn(`[embedding] Attempt ${attempts} failed: ${err.message}`)
      if (attempts > maxRetries) {
        console.error(`[embedding] Failed to generate embedding after ${attempts} attempts:`, err.message)
        return null
      }
      // Brief backoff before retry
      await new Promise(r => setTimeout(r, 600 * attempts))
    }
  }

  return null
}

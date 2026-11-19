import { getEnv, csv } from '../../config/env.js'

/**
 * AI data-routing policy, in one place so it can't be bypassed piecemeal.
 *
 *  public  — content anyone can already read (a public web page you saved)
 *  private — your own words or files: notes, quotes, images, PDFs, and any
 *            item carrying a personal note
 *
 * Private content may only go to providers listed in AI_PRIVATE_PROVIDERS
 * (those you use under zero-retention / no-training terms). Items with
 * `aiOptOut` never go to any provider.
 */
export const PROVIDERS = {
  groq: 'Groq (summaries & tags)',
  gemini: 'Google Gemini (search embeddings)',
}

export function sensitivityOf(item) {
  if (item?.type === 'link' && !item?.note?.trim()) return 'public'
  return 'private'
}

export function aiDecision(item, provider) {
  if (!PROVIDERS[provider]) return { allowed: false, reason: 'unknown_provider' }
  if (item?.aiOptOut) return { allowed: false, reason: 'opted_out' }
  if (sensitivityOf(item) === 'private' && !csv(getEnv().AI_PRIVATE_PROVIDERS).includes(provider)) {
    return { allowed: false, reason: 'provider_not_approved_for_private_data' }
  }
  return { allowed: true }
}

export const aiAllowed = (item, provider) => aiDecision(item, provider).allowed

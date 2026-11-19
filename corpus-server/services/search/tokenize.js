/**
 * Tokenizer for the encrypted inverted index. Tokens are never stored — only
 * their per-user HMACs (blind indexes) — so documents and queries must be
 * normalised identically.
 */
const STOPWORDS = new Set(
  ('a an and are as at be but by for from has have he her his i if in into is it its of on or our she so ' +
    'that the their them then there these they this to was we were what when which who will with you your')
    .split(' ')
)
const MAX_TOKENS_PER_DOC = 600

/** Lowercase + strip accents — applied identically to documents, queries and verification. */
export const normalizeText = text =>
  String(text || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()

export function tokenize(text, { max = MAX_TOKENS_PER_DOC } = {}) {
  if (!text) return []
  const words = normalizeText(text).split(/[^\p{L}\p{N}]+/u)
  const out = new Set()
  for (const w of words) {
    if (w.length < 2 || w.length > 40 || STOPWORDS.has(w)) continue
    out.add(w)
    if (out.size >= max) break
  }
  return [...out]
}

/**
 * Prefix keys for search-as-you-type. Every word is indexed by its first 2–6
 * characters ("insurance" → in, ins, insu, insur, insura), and a query word
 * is looked up by its first ≤6 characters. The index only finds candidates;
 * the caller confirms real matches against the decrypted text.
 */
export const MIN_PREFIX = 2
export const MAX_PREFIX = 6

export function prefixKeys(text) {
  const keys = new Set()
  for (const word of tokenize(text, { max: 2000 })) {
    for (let n = MIN_PREFIX; n <= Math.min(MAX_PREFIX, word.length); n++) keys.add(word.slice(0, n))
  }
  return [...keys]
}

/** Query words (stopwords kept: a user typing "th" may be heading for "thermal"). */
export function queryTerms(q) {
  return normalizeText(q).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= MIN_PREFIX).slice(0, 8)
}

export const queryKey = term => term.slice(0, MAX_PREFIX)

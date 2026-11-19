/**
 * Split page texts into ~TARGET-char chunks for search and embeddings.
 * Chunks never straddle more than a few pages and remember their page range,
 * so search hits can say "page 14" and the viewer can jump there.
 */
const TARGET = 1200
const MIN_TEXT = 1

const clean = s => s.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()

function splitLong(text) {
  if (text.length <= TARGET * 1.5) return [text]
  const parts = []
  let rest = text
  while (rest.length > TARGET * 1.5) {
    // prefer a sentence or line boundary near the target size
    const window = rest.slice(0, TARGET * 1.3)
    let cut = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('. '))
    if (cut < TARGET * 0.5) cut = window.lastIndexOf(' ')
    if (cut < TARGET * 0.5) cut = TARGET
    parts.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1)
  }
  if (rest.trim()) parts.push(rest.trim())
  return parts
}

export function chunkPages(pages) {
  const chunks = []
  let buf = ''
  let start = null
  let end = null
  let pageOffsets = [] // char offset in `text` where each page after pageStart begins
  const flush = () => {
    if (buf.trim().length >= MIN_TEXT) chunks.push({ text: buf, pageStart: start, pageEnd: end, pageOffsets })
    buf = ''
    start = null
    pageOffsets = []
  }

  pages.forEach((raw, i) => {
    const page = i + 1
    for (const piece of splitLong(clean(raw || ''))) {
      if (!piece) continue
      if (buf && buf.length + piece.length > TARGET) flush()
      if (start === null) start = page
      if (end !== null && page !== end && buf) pageOffsets.push(buf.length + 1)
      end = page
      buf += (buf ? '\n' : '') + piece
    }
  })
  flush()
  return chunks.map((c, ordinal) => ({ ...c, ordinal }))
}

export const totalTextLength = pages => pages.reduce((n, p) => n + clean(p || '').length, 0)

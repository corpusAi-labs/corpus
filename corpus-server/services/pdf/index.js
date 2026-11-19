import { Worker } from 'worker_threads'
import { getEnv } from '../../config/env.js'

const WORKER_URL = new URL('./pdfWorker.js', import.meta.url)

export class PdfError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/** Cheap structural check before handing bytes to a parser: the PDF header must appear in the first 1 KB. */
export function looksLikePdf(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 8 && buffer.subarray(0, 1024).includes('%PDF-')
}

/**
 * Parse untrusted PDFs off the main thread, with a hard memory ceiling and a
 * wall-clock timeout. A malicious or pathological file can at worst kill its
 * own worker, never the API process.
 */
function runWorker(buffer, { mode, maxPages = 0 }) {
  const { PDF_WORKER_TIMEOUT_MS, PDF_WORKER_MEMORY_MB } = getEnv()
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_URL, {
      workerData: { buffer, mode, maxPages },
      execArgv: [], // don't inherit parent flags (e.g. --test, --inspect)
      resourceLimits: { maxOldGenerationSizeMb: PDF_WORKER_MEMORY_MB },
    })
    let settled = false
    const done = fn => v => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.terminate()
      fn(v)
    }
    const ok = done(resolve)
    const fail = done(reject)
    const timer = setTimeout(() => fail(new PdfError('timeout', 'PDF took too long to read')), PDF_WORKER_TIMEOUT_MS)

    worker.once('message', msg => (msg.ok ? ok(msg) : fail(new PdfError(msg.code, msg.message))))
    worker.once('error', err => fail(new PdfError('invalid', err.message)))
    worker.once('exit', code => fail(new PdfError(code ? 'crashed' : 'invalid', `PDF worker exited (${code})`)))
  })
}

/** Page count only (fast) — used at upload time to enforce plan limits and price credits. */
export async function inspectPdf(buffer) {
  if (!looksLikePdf(buffer)) throw new PdfError('not_pdf', 'This file is not a PDF')
  const { numPages } = await runWorker(buffer, { mode: 'inspect' })
  if (!numPages) throw new PdfError('invalid', 'This PDF has no pages')
  return { numPages }
}

/** Text of the first `maxPages` pages, one string per page. */
export async function extractPdfPages(buffer, maxPages) {
  const { numPages, pages } = await runWorker(buffer, { mode: 'extract', maxPages })
  return { numPages, pages }
}

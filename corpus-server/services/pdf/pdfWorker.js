/**
 * Runs inside a worker thread with its own memory cap (see ./index.js).
 * PDF.js is configured defensively: no eval (CVE-2024-4367 class of bugs),
 * no font loading, no rendering — we only read the text layer.
 */
import { parentPort, workerData } from 'worker_threads'
import { getDocumentProxy } from 'unpdf'

const { buffer, maxPages, mode } = workerData

try {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    stopAtErrors: false,
    verbosity: 0, // errors only
  })
  const numPages = pdf.numPages

  if (mode === 'inspect') {
    parentPort.postMessage({ ok: true, numPages })
  } else {
    const pages = []
    const last = Math.min(numPages, maxPages)
    for (let i = 1; i <= last; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      pages.push(content.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join(''))
      page.cleanup()
    }
    parentPort.postMessage({ ok: true, numPages, pages })
  }
  await pdf.destroy()
} catch (err) {
  parentPort.postMessage({
    ok: false,
    code: err?.name === 'PasswordException' ? 'encrypted' : 'invalid',
    message: err?.message || String(err),
  })
}

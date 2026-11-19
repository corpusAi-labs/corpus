import { useEffect, useState } from 'react'
import { fetchItemFile } from '../../api/items.js'

/** Words → at most `max`, for a TLDR fallback when an older item has no tldr field. */
export function shortTldr(item, max = 30) {
  const text = (item.tldr || item.summary || '').trim()
  const words = text.split(/\s+/).filter(Boolean)
  return words.length <= max ? text : words.slice(0, max).join(' ') + '…'
}

const STAGE = {
  queued: 'Waiting to read',
  extracting: 'Reading pages',
  indexing: 'Indexing every page',
  summarizing: 'Writing the summary',
}

function SummaryTab({ item }) {
  const p = item.processing || {}
  if (item.status === 'pending_ai') {
    return (
      <div className="max-w-[640px]">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#9439f9] mb-3">
          {STAGE[p.stage] || 'Processing'} · {p.progress || 0}%
        </p>
        {[100, 92, 97, 70, 0, 88, 95, 60].map((w, i) => (
          <div key={i} className="h-3 rounded-full bg-[#E8E5DC] mb-2.5 animate-pulse" style={{ width: `${w}%`, opacity: w ? 1 : 0 }} />
        ))}
      </div>
    )
  }
  if (p.stage === 'failed') return <p className="text-[14px] text-red-600">{p.error || "We couldn't read this PDF."}</p>
  if (p.note === 'no_text') {
    return <p className="text-[14px] text-muted max-w-[560px]">This looks like a scanned PDF with no text layer, so there's nothing to summarise yet. Open the Document tab to view it.</p>
  }
  if (item.aiOptOut && !item.summary) {
    return <p className="text-[14px] text-muted max-w-[560px]">AI is off for this PDF, so no summary was written. It's still encrypted and searchable by its text.</p>
  }
  if (!item.summary) return <p className="text-[14px] text-muted">No summary yet.</p>

  return (
    <article className="max-w-[640px]">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-3">Summary</p>
      {item.summary.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="font-serif text-[16px] leading-relaxed text-ink mb-4">{para}</p>
      ))}
      {item.keyPoints?.length > 0 && (
        <>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted mt-6 mb-3">Key points</p>
          <ul className="space-y-2.5">
            {item.keyPoints.map((kp, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] leading-snug text-ink">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#9439f9] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{kp}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {item.processing?.note === 'truncated' && (
        <p className="text-[12px] text-muted mt-6">Based on the first {item.file?.pagesIndexed} of {item.file?.pageCount} pages.</p>
      )}
    </article>
  )
}

/**
 * Summary (default) and the original PDF — decrypted server-side for its
 * owner and delivered as a blob, so it never has a shareable URL.
 */
export default function PdfViewer({ item }) {
  const startPage = item.match?.pageStart
  // Opened from a search hit → go straight to the matching page
  const [tab, setTab] = useState(startPage ? 'document' : 'summary')
  const [fileUrl, setFileUrl] = useState(null)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    let url
    let cancelled = false
    setFileUrl(null)
    setFileError('')
    fetchItemFile(item._id)
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        setFileUrl(url)
      })
      .catch(() => !cancelled && setFileError("Couldn't open this PDF."))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [item._id])

  function download() {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = (item.file?.name || item.title || 'document') .replace(/(\.pdf)?$/i, '.pdf')
    a.click()
  }

  const tabClass = active =>
    `px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider border transition-colors ${active ? 'bg-ink text-white border-ink' : 'bg-white text-muted border-line hover:text-ink'}`

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-line bg-white">
        <button className={tabClass(tab === 'summary')} onClick={() => setTab('summary')}>Summary</button>
        <button className={tabClass(tab === 'document')} onClick={() => setTab('document')}>Document</button>
        <div className="flex-1" />
        {startPage && <span className="font-mono text-[10px] text-[#9439f9]">match on page {startPage}</span>}
        <button onClick={download} disabled={!fileUrl} className="font-mono text-[10px] uppercase tracking-wider text-muted hover:text-ink disabled:opacity-40">
          Download ↓
        </button>
      </div>

      {tab === 'document' ? (
        <div className="flex-1 min-h-0 bg-[#E8E5DC]">
          {fileError ? (
            <p className="p-6 text-[13px] text-red-600">{fileError}</p>
          ) : fileUrl ? (
            <iframe
              title={item.title || 'PDF'}
              src={`${fileUrl}#page=${startPage || 1}&view=FitH`}
              className="w-full h-full border-0"
            />
          ) : (
            <p className="p-6 font-mono text-[11px] text-muted uppercase tracking-wider">Decrypting…</p>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
          <SummaryTab item={item} />
        </div>
      )}
    </div>
  )
}

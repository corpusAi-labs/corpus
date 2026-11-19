import { useEffect, useState } from 'react'
import { FiTrash2, FiExternalLink } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios.js'
import { shortTldr } from './PdfViewer.jsx'
import { fetchSpaces } from '../../api/spaces.js'

function getDisplayThumbnail(thumbnailUrl, itemUrl) {
  if (!thumbnailUrl) return null
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && thumbnailUrl.includes('localhost:')) {
    if (itemUrl) {
      return `https://api.microlink.io/?url=${encodeURIComponent(itemUrl)}&screenshot=true&embed=screenshot.url`
    }
  }
  return thumbnailUrl
}

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const dy = Math.floor(h / 24); if (dy < 30) return `${dy}d`
  return new Date(d).toLocaleDateString()
}

const colorMap = {
  note: { border: '#f74700', bg: '#f7470028', text: '#f74700' },
  quote: { border: '#259d27', bg: '#259d2728', text: '#259d27' },
  link: { border: '#0d5ddf', bg: '#0d5ddf28', text: '#0d5ddf' },
  image: { border: '#faa200', bg: '#faa20028', text: '#faa200' },
  thought: { border: '#9439f9', bg: '#9439f928', text: '#9439f9' },
  pdf: { border: '#9439f9', bg: '#9439f928', text: '#9439f9' },
}

/** Bold the words that matched, so it's obvious why this card is a result. */
function Highlighted({ text, terms = [] }) {
  const words = terms.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!words.length) return text
  const re = new RegExp(`(${words.join('|')})`, 'gi')
  return text.split(re).map((part, i) =>
    i % 2 ? <mark key={i} className="bg-[#9439f9]/15 text-black font-semibold rounded-[2px] px-[1px]">{part}</mark> : part
  )
}

const STAGE_LABEL = {
  queued: 'Waiting to read…',
  extracting: 'Reading pages…',
  indexing: 'Making every page searchable…',
  summarizing: 'Summarising…',
}

function PdfBody({ item, isPending }) {
  const p = item.processing || {}
  const pages = item.file?.pageCount
  return (
    <>
      <div className="flex gap-3 items-start">
        <div className="w-8 h-10 shrink-0 rounded-[3px] bg-[#9439f9] border border-black shadow-[2px_2px_0px_black] flex items-end justify-center pb-0.5 text-[7px] font-bold text-white tracking-wider font-circular">
          PDF
        </div>
        <div className="min-w-0 flex-1">
          {item.title && <h3 className="text-[13px] font-bold text-gray-900 font-roc line-clamp-2">{item.title}</h3>}
          <p className="text-[11px] text-gray-400 font-circular mt-0.5">
            {pages ? `${pages} page${pages === 1 ? '' : 's'}` : 'PDF'}
            {item.docType && item.docType !== 'other' ? ` · ${item.docType.replace(/-/g, ' ')}` : ''}
            {item.aiOptOut ? ' · AI off' : ''}
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="mt-1">
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-[#9439f9] transition-all duration-700" style={{ width: `${Math.max(5, p.progress || 0)}%` }} />
          </div>
          <p className="text-[11px] text-[#9439f9] font-circular mt-1.5">{STAGE_LABEL[p.stage] || 'Processing…'}</p>
        </div>
      ) : p.stage === 'failed' ? (
        <p className="text-[11px] text-red-500 font-circular">{p.error || "Couldn't read this PDF."}</p>
      ) : (
        <>
          {(item.tldr || item.summary) && <p className="text-[12px] leading-relaxed text-gray-700 line-clamp-2">{shortTldr(item)}</p>}
          {p.note === 'no_text' && <p className="text-[11px] text-gray-400 font-circular">Scanned PDF — text isn't searchable yet</p>}
          {p.note === 'truncated' && (
            <p className="text-[11px] text-gray-400 font-circular">First {item.file?.pagesIndexed} of {pages} pages indexed</p>
          )}
        </>
      )}
    </>
  )
}

export default function ItemCard({ item: initialItem, onClick, onDelete }) {
  const [item, setItem] = useState(initialItem)
  const isPending = item.status === 'pending_ai'

  const { data: spacesData } = useQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
    staleTime: 30000,
  })
  const spaces = spacesData?.spaces || []
  const associatedSpace = spaces.find(s => s._id === item.spaceId)
  const spaceColor = associatedSpace?.color

  const [maskStyle, setMaskStyle] = useState({
    maskImage: 'none',
    WebkitMaskImage: 'none'
  })

  useEffect(() => {
    setItem(initialItem)
  }, [initialItem])

  useEffect(() => {
    if (!isPending) return
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/items/${item._id}`)
        if (item.type === 'pdf') setItem(data.item) // live progress
        if (data.item.status !== 'pending_ai') {
          setItem(data.item)
          clearInterval(interval)
        }
      } catch {}
    }, 2500)
    return () => clearInterval(interval)
  }, [item._id, isPending, item.type])

  const domain = (() => {
    try { return new URL(item.url).hostname.replace('www.', '') } catch { return null }
  })()

  // Track cursor for grid reveal hover effect
  function handlePointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const maskImg = `radial-gradient(circle at ${x}px ${y}px, black 55px, transparent 115px)`
    setMaskStyle({
      maskImage: maskImg,
      WebkitMaskImage: maskImg
    })
  }

  const type = item.type || 'note'
  const colors = colorMap[type] || colorMap.note

  return (
    <div
      onPointerMove={handlePointerMove}
      onClick={() => onClick?.(item)}
      className={`memory-card relative overflow-hidden rounded-[9px] bg-white p-4 border-2 transition-all duration-200 cursor-pointer group select-none flex flex-col justify-between ${
        isPending
          ? 'animate-border-flash'
          : 'border-transparent hover:border-black'
      }`}
      style={{
        '--hover-border-color': colors.border
      }}
    >
      {/* Grid reveal mask overlay */}
      <div
        className="grid-reveal absolute inset-0 pointer-events-none z-10"
        style={maskStyle}
      />

      <div className="relative z-20 flex flex-col gap-2">
        {/* Header (badge + date/status) */}
        <div className="flex justify-between items-center w-full">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-circular"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {type}
          </span>
          <span className="text-[10px] text-gray-400 font-circular">{timeAgo(item.createdAt)}</span>
        </div>

        {/* Content Section based on type */}
        <div className="flex flex-col gap-1.5 mt-1">
          {type === 'link' && (() => {
            const displayThumbnail = getDisplayThumbnail(item.thumbnailUrl, item.url)
            return (
              <>
                {displayThumbnail ? (
                  <div className="relative rounded-md overflow-hidden border border-gray-100 h-24 mb-1">
                    <img
                      src={displayThumbnail}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      onError={e => {
                        if (item.url && !e.target.src.includes('microlink.io')) {
                          e.target.src = `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&embed=screenshot.url`
                        } else if (e.target.parentElement) {
                          e.target.parentElement.style.display = 'none'
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="rounded-md w-full flex items-center justify-center h-[44px] mb-1 opacity-90 group-hover:opacity-100 transition-opacity border border-black/10"
                    style={{ backgroundColor: spaceColor || '#000000' }}
                  >
                    <span className="text-white text-[11px] font-bold tracking-wide uppercase font-circular px-3 truncate">
                      {item.title || domain || 'Link'}
                    </span>
                  </div>
                )}
                {item.title && <h3 className="text-[13px] font-bold text-gray-900 font-roc line-clamp-2">{item.title}</h3>}
                {domain && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-gray-400 font-circular truncate">{domain}</span>
                    {item.url && <FiExternalLink className="text-[10px] text-gray-400 group-hover:text-black transition-colors" />}
                  </div>
                )}
              </>
            )
          })()}

          {type === 'image' && (
            <>
              {item.thumbnailUrl && (
                <div className="rounded-md overflow-hidden border border-gray-100 mb-1 max-h-36">
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
              )}
              {item.title && <h3 className="text-[13px] font-bold text-gray-900 font-roc line-clamp-2">{item.title}</h3>}
            </>
          )}

          {type === 'note' && (
            <>
              {item.title && <h3 className="text-[13px] font-bold text-gray-900 font-roc line-clamp-2">{item.title}</h3>}
              {item.content && (
                <p className="text-[12px] leading-relaxed text-gray-700 line-clamp-3">
                  {item.content}
                </p>
              )}
            </>
          )}

          {type === 'quote' && (
            <>
              {item.content && (
                <blockquote className="text-[12px] italic text-gray-800 leading-relaxed font-roc border-l-2 border-gray-200 pl-2 line-clamp-3">
                  "{item.content}"
                </blockquote>
              )}
              {item.title && <span className="text-[11px] text-gray-400 font-circular block">— {item.title}</span>}
            </>
          )}

          {type === 'pdf' && <PdfBody item={item} isPending={isPending} />}

          {/* Where the search matched inside a document */}
          {item.match?.snippet && (
            <div className="rounded-[6px] bg-[#fff8f4] border border-black/10 px-2.5 py-2">
              <span className="text-[9px] font-bold uppercase tracking-wider font-circular text-[#9439f9]">
                Page {item.match.pageStart}{item.match.pageEnd && item.match.pageEnd !== item.match.pageStart ? `–${item.match.pageEnd}` : ''}
              </span>
              <p className="text-[11.5px] leading-snug text-gray-700 font-circular mt-0.5 line-clamp-2"><Highlighted text={item.match.snippet} terms={item.match.terms} /></p>
            </div>
          )}

          {/* Fallback layout */}
          {type !== 'link' && type !== 'image' && type !== 'note' && type !== 'quote' && type !== 'pdf' && (
            <>
              {item.title && <h3 className="text-[13px] font-bold text-gray-900 font-roc">{item.title}</h3>}
              {item.content && <p className="text-[12px] leading-relaxed text-gray-700 line-clamp-3">{item.content}</p>}
            </>
          )}
        </div>

        {/* Footer (tags + quick delete) */}
        <div className="flex justify-between items-center mt-1 pt-2 border-t border-gray-50 relative">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[80%] overflow-hidden">
            {item.tags && item.tags.length > 0 && (
              <>
                <span
                  key={item.tags[0]}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-circular bg-gray-100 text-gray-600 group-hover:bg-black/5 truncate"
                >
                  {item.tags[0]}
                </span>
                {item.tags.length > 1 && (
                  <span className="text-[9px] font-bold text-gray-400 font-circular shrink-0">
                    +{item.tags.length - 1}
                  </span>
                )}
              </>
            )}
          </div>

          {onDelete && !isPending ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item._id)
              }}
              className="w-6 h-6 rounded-full border border-gray-200 hover:border-red-500 hover:text-red-500 bg-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30"
              title="Delete Item"
            >
              <FiTrash2 className="text-[10px]" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Hover border coloring via inline style rule override */}
      <style jsx="true">{`
        .memory-card:hover {
          border-color: var(--hover-border-color) !important;
        }
      `}</style>
    </div>
  )
}
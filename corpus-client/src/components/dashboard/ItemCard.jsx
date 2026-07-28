import { useEffect, useState } from 'react'
import { FiTrash2, FiExternalLink } from 'react-icons/fi'
import api from '../../api/axios.js'

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
  thought: { border: '#9439f9', bg: '#9439f928', text: '#9439f9' }
}

export default function ItemCard({ item: initialItem, onClick, onDelete }) {
  const [item, setItem] = useState(initialItem)
  const isPending = item.status === 'pending_ai'

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
        if (data.item.status !== 'pending_ai') {
          setItem(data.item)
          clearInterval(interval)
        }
      } catch {}
    }, 2500)
    return () => clearInterval(interval)
  }, [item._id, isPending])

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
      onClick={() => onClick(item)}
      className="memory-card relative overflow-hidden rounded-[9px] bg-white p-5 min-h-[160px] border-2 border-transparent hover:border-black transition-all duration-200 cursor-pointer break-inside-avoid mb-5 group select-none flex flex-col justify-between"
      style={{
        '--hover-border-color': colors.border
      }}
    >
      {/* Grid reveal mask overlay */}
      <div
        className="grid-reveal absolute inset-0 pointer-events-none z-10"
        style={maskStyle}
      />

      <div className="relative z-20 flex flex-col h-full gap-3 justify-between flex-1">
        {/* Header (badge + date/status) */}
        <div className="flex justify-between items-center w-full">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-circular"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {type}
          </span>
          <div className="flex items-center gap-1.5">
            {isPending && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                scanning
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-circular">{timeAgo(item.createdAt)}</span>
          </div>
        </div>

        {/* Content Section based on type */}
        <div className="flex-1 flex flex-col gap-2 mt-2">
          {type === 'link' && (
            <>
              {item.thumbnailUrl ? (
                <div className="relative rounded-md overflow-hidden border border-gray-100 max-h-32 mb-1">
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                    onError={e => e.target.style.display = 'none'}
                  />
                </div>
              ) : (
                <div
                  className="rounded-md w-full flex items-center justify-center h-[60px] mb-1 opacity-90 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${colors.border} 0%, #faa200 100%)` }}
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
          )}

          {type === 'image' && (
            <>
              {item.thumbnailUrl && (
                <div className="rounded-md overflow-hidden border border-gray-100 mb-1 max-h-48">
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
                <p className="text-[12px] leading-relaxed text-gray-700 flex-1 line-clamp-4">
                  {item.content}
                </p>
              )}
            </>
          )}

          {type === 'quote' && (
            <>
              {item.content && (
                <blockquote className="text-[12px] italic text-gray-800 leading-relaxed flex-1 font-roc border-l-2 border-gray-200 pl-2">
                  "{item.content}"
                </blockquote>
              )}
              {item.title && <span className="text-[11px] text-gray-400 font-circular block">— {item.title}</span>}
            </>
          )}

          {/* Fallback layout */}
          {type !== 'link' && type !== 'image' && type !== 'note' && type !== 'quote' && (
            <>
              {item.title && <h3 className="text-[13px] font-bold text-gray-900 font-roc">{item.title}</h3>}
              {item.content && <p className="text-[12px] leading-relaxed text-gray-700 flex-1">{item.content}</p>}
            </>
          )}
        </div>

        {/* Footer (tags + quick delete) */}
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50 relative">
          <div className="flex gap-1 flex-wrap max-w-[80%]">
            {item.tags && item.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-circular bg-gray-100 text-gray-600 group-hover:bg-black/5"
              >
                {tag}
              </span>
            ))}
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

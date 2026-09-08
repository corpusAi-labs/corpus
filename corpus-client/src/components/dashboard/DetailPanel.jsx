import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateItem, deleteItem, retryItemAI } from '../../api/items.js'
import api from '../../api/axios.js'
import SpacePicker from '../spaces/SpacePicker.jsx'

function cleanTextContent(raw) {
  if (!raw) return ''
  return raw
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // Fix spaced out characters from animated spans like "T w i t t e r" -> "Twitter"
    .replace(/\b([A-Za-z])(?:\s+[A-Za-z]){2,}\b/g, (match) => match.replace(/\s+/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

export default function DetailPanel({ item: initialItem, onClose, onDelete, onUpdate }) {
  const [item, setItem] = useState(initialItem)
  const [tags, setTags] = useState(initialItem?.tags || [])
  const [note, setNote] = useState(initialItem?.note || '')
  const [spaceId, setSpaceId] = useState(initialItem?.spaceId || null)
  const [showRetry, setShowRetry] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [expandedDesc, setExpandedDesc] = useState(false)
  const tagInputRef = useRef(null)
  const noteTimer = useRef(null)
  const pollRef = useRef(null)

  // sync when item prop changes
  useEffect(() => {
    setItem(initialItem)
    setTags(initialItem?.tags || [])
    setNote(initialItem?.note || '')
    setSpaceId(initialItem?.spaceId || null)
    setShowRetry(false)
    setExpandedDesc(false)
  }, [initialItem?._id])

  // poll for AI results if summary missing
  // Poll while the item is genuinely still processing (status === 'pending_ai').
  // Stop the instant the backend tells us explicitly: either summary arrived,
  // or aiFailed is true — no more guessing based on elapsed time.
  useEffect(() => {
    if (!item || item.status !== 'pending_ai') {
      setShowRetry(!!item?.aiFailed && !item?.summary)
      return
    }
    setShowRetry(false)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/items/${item._id}`)
        if (data.item.status !== 'pending_ai') {
          setItem(data.item)
          setTags(data.item.tags || [])
          onUpdate?.()
          setShowRetry(!!data.item.aiFailed && !data.item.summary)
          clearInterval(pollRef.current)
        }
      } catch {}
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [item?._id, item?.status])

  async function handleRetryAI() {
    setRetrying(true)
    setShowRetry(false)
    try {
      await retryItemAI(item._id)
      setItem(prev => ({ ...prev, status: 'pending_ai', aiFailed: false }))
    } catch {
      setRetrying(false)
      setShowRetry(true)
    }
  }

  // once retry kicks the item back into pending_ai, the effect above
  // will pick up polling automatically and clear `retrying` when done
  useEffect(() => {
    if (item?.status !== 'pending_ai') setRetrying(false)
  }, [item?.status])

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus()
  }, [addingTag])

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  function handleNoteChange(val) {
    setNote(val)
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(async () => {
      try { await updateItem(item._id, { note: val }); onUpdate?.() } catch {}
    }, 1000)
  }

  async function addTag() {
    const val = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!val || tags.includes(val)) { setTagInput(''); setAddingTag(false); return }
    const newTags = [...tags, val]
    setTags(newTags)
    setTagInput('')
    setAddingTag(false)
    try { await updateItem(item._id, { tags: newTags }); onUpdate?.() } catch { setTags(tags) }
  }

  async function removeTag(tag) {
    const newTags = tags.filter(t => t !== tag)
    setTags(newTags)
    try { await updateItem(item._id, { tags: newTags }); onUpdate?.() } catch { setTags(tags) }
  }

  async function handleSpaceChange(newSpaceId) {
    setSpaceId(newSpaceId)
    try { await updateItem(item._id, { spaceId: newSpaceId }); onUpdate?.() } catch {}
  }

  async function handleDelete() {
    if (!confirm('Remove this item?')) return
    try { await deleteItem(item._id); onDelete(item._id); onClose() } catch {}
  }

  if (!item) return null

  const domain = (() => { try { return new URL(item.url).hostname.replace('www.', '') } catch { return null } })()
  const isLink = item.type === 'link'
  const isImage = item.type === 'image'
  const isText = item.type === 'note' || item.type === 'quote'
  const aiLoading = item.status === 'pending_ai'

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-10 pointer-events-none"
      >
        <div className="pointer-events-auto w-full max-w-5xl h-[82vh] bg-white rounded-md border border-line shadow-2xl flex overflow-hidden">

          {/* ── LEFT — content ── */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-line bg-[#F5F4EF]">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-white shrink-0">
              <div className="flex items-center gap-2">
                {item.faviconUrl && <img src={item.faviconUrl} alt="" className="w-4 h-4" />}
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  {domain || item.type}
                </span>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center font-mono text-[13px] text-muted hover:text-ink rounded-sm hover:bg-[#F0EFE9] transition-colors">✕</button>
            </div>

            {/* content area */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const displayThumbnail = (isLink || isImage) && item.thumbnailUrl
                  ? (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && item.thumbnailUrl.includes('localhost:') && item.url
                      ? `https://api.microlink.io/?url=${encodeURIComponent(item.url)}&screenshot=true&embed=screenshot.url`
                      : item.thumbnailUrl)
                  : null
                return displayThumbnail ? (
                  <img src={displayThumbnail} alt="" className="w-full h-auto object-cover"
                    onError={e => e.target.style.display = 'none'} />
                ) : null
              })()}
              {item.title && (
                <div className="px-6 pt-5 pb-2">
                  <h2 className="font-serif text-[22px] leading-snug text-ink">{item.title}</h2>
                </div>
              )}
              {isLink && item.content && (() => {
                const cleaned = cleanTextContent(item.content)
                const isLong = cleaned.length > 200
                return (
                  <div className="mx-6 mb-6 mt-1 p-4 rounded-xl bg-white/90 border border-line shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-line/60">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted flex items-center gap-1.5 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        Page Excerpt
                      </span>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => setExpandedDesc(!expandedDesc)}
                          className="font-mono text-[10px] text-muted hover:text-ink transition-colors cursor-pointer"
                        >
                          {expandedDesc ? 'Show less' : 'Show full'}
                        </button>
                      )}
                    </div>
                    <p className={`text-[13.5px] leading-relaxed text-ink/85 font-serif transition-all ${!expandedDesc && isLong ? 'line-clamp-3' : ''}`}>
                      {cleaned}
                    </p>
                  </div>
                )
              })()}
              {isText && item.content && (
                <div className="px-6 py-4">
                  <p className={`text-[15px] leading-relaxed text-ink ${item.type === 'quote' ? 'font-serif italic border-l-2 border-line pl-4' : ''}`}>
                    {item.type === 'quote' ? `"${item.content}"` : item.content}
                  </p>
                </div>
              )}
            </div>

            {/* visit button */}
            {isLink && item.url && (
              <div className="px-5 py-4 border-t border-line bg-white shrink-0">
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-wide text-paper bg-ink px-4 py-2.5 rounded-sm hover:bg-accent transition-colors">
                  Visit <span className="text-[10px]">↗</span>
                </a>
              </div>
            )}
          </div>

          {/* ── RIGHT — details ── */}
          <div className="w-80 shrink-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* TLDR — with creating memory animation */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">TLDR</p>
                {showRetry ? (
                  <div className="text-center py-3">
                    <p className="text-[12px] text-muted mb-2">AI tagging didn't finish. Try again?</p>
                    <button
                      onClick={handleRetryAI}
                      disabled={retrying}
                      className="font-mono text-[11px] uppercase tracking-wide bg-accent text-white px-4 py-1.5 rounded-full hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      {retrying ? 'Retrying…' : 'Retry AI tagging'}
                    </button>
                  </div>
                ) : aiLoading ? (
                  <div className="space-y-2">
                    {/* animated "creating memory" state */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 rounded-full bg-accent"
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-accent/70 uppercase tracking-wider">
                        creating memory
                      </span>
                    </div>
                    {/* skeleton lines */}
                    {[100, 85, 60].map((w, i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                        className="h-2.5 bg-[#E8E5DC] rounded-full"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[13.5px] leading-relaxed text-ink"
                  >
                    {item.summary}
                  </motion.p>
                )}
              </div>

              {/* MIND TAGS */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-3">Mind Tags</p>
                {aiLoading ? (
                  <div className="flex gap-2">
                    {[60, 80, 50].map((w, i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                        className="h-6 bg-[#E8E5DC] rounded-full"
                        style={{ width: `${w}px` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {addingTag ? (
                      <input
                        ref={tagInputRef}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
                          if (e.key === 'Escape') { setTagInput(''); setAddingTag(false) }
                        }}
                        onBlur={addTag}
                        placeholder="type tag…"
                        className="font-mono text-[11px] bg-white border border-accent rounded-full px-3 py-1 outline-none w-24 text-ink"
                      />
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAddingTag(true)}
                        className="font-mono text-[11px] bg-accent text-white px-3 py-1 rounded-full hover:bg-accent/90 transition-colors"
                      >
                        + Add tag
                      </motion.button>
                    )}
                    <AnimatePresence>
                      {tags.map(tag => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="group flex items-center gap-1 font-mono text-[11px] bg-[#F0EFE9] border border-line text-ink px-3 py-1 rounded-full"
                        >
                          {tag}
                          <button onClick={() => removeTag(tag)} className="text-muted hover:text-red-500 leading-none">×</button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* MIND NOTES */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-2">Mind Notes</p>
                <textarea
                  value={note}
                  onChange={e => handleNoteChange(e.target.value)}
                  placeholder="Type here to add a note…"
                  rows={4}
                  className="w-full bg-[#F5F4EF] border border-transparent rounded-sm px-3 py-2.5 text-[13px] resize-none focus:outline-none focus:border-line transition-colors placeholder:text-muted"
                />
              </div>

              {/* SPACE */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-2">Space</p>
                <SpacePicker value={spaceId} onChange={handleSpaceChange} />
              </div>

              {/* meta */}
              <div className="text-[11px] text-muted font-mono space-y-1 pt-2 border-t border-line">
                <p>{new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {domain && <p>{domain}</p>}
              </div>
            </div>

            {/* footer */}
            <div className="px-5 py-3 border-t border-line flex items-center justify-end shrink-0">
              <button onClick={handleDelete} className="font-mono text-[11px] uppercase tracking-wide text-muted hover:text-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

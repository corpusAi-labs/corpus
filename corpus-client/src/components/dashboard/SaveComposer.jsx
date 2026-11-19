import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SpacePicker from '../spaces/SpacePicker.jsx'

const TYPES = [
  { value: 'link', label: 'LINK', color: '#0d5ddf' },
  { value: 'note', label: 'NOTE', color: '#f74700' },
  { value: 'quote', label: 'QUOTE', color: '#259d27' },
  { value: 'image', label: 'IMAGE', color: '#faa200' },
  { value: 'pdf', label: 'PDF', color: '#9439f9' },
]

const MAX_PDF_BYTES = 50 * 1024 * 1024
const isPdfFile = f => f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
const formatSize = b => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function SaveComposer({ isOpen, onClose, onSave, isSaving, initialFile }) {
  const [type, setType] = useState('link')
  const [url, setUrl] = useState('')
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [spaceId, setSpaceId] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [aiOptOut, setAiOptOut] = useState(false)
  const [pdfDragOver, setPdfDragOver] = useState(false)
  const fileRef = useRef(null)
  const pdfRef = useRef(null)

  // A file dropped anywhere on the dashboard opens the composer pre-filled
  useEffect(() => {
    if (!isOpen || !initialFile) return
    if (isPdfFile(initialFile)) { setType('pdf'); choosePdf(initialFile) }
    else if (initialFile.type?.startsWith('image/')) {
      setType('image'); setImageFile(initialFile); setImagePreview(URL.createObjectURL(initialFile))
    } else setError("That file type isn't supported yet — try a PDF or an image.")
  }, [isOpen, initialFile])

  function choosePdf(file) {
    setError('')
    if (!isPdfFile(file)) return setError("That file isn't a PDF.")
    if (file.size > MAX_PDF_BYTES) return setError('PDFs can be up to 50 MB.')
    setPdfFile(file)
  }

  function reset() {
    setType('link'); setUrl(''); setContent(''); setTitle(''); setSpaceId(null)
    setImageFile(null); setImagePreview(null); setError('')
    setPdfFile(null); setAiOptOut(false); setPdfDragOver(false)
  }
  function handleClose() { reset(); onClose() }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleSubmit(e) {
    if (e) e.preventDefault()
    setError('')
    if (type === 'link' && !url.trim()) return setError('Paste a URL.')
    if ((type === 'note' || type === 'quote') && !content.trim()) return setError('Write something.')
    if (type === 'image' && !imageFile) return setError('Choose an image.')
    if (type === 'pdf' && !pdfFile) return setError('Choose a PDF.')

    // Close the composer immediately so the user can see the animated saving card in the grid
    onSave({ type, url, content, title, imageFile, pdfFile, aiOptOut, spaceId })
    handleClose()
  }

  const activeColor = TYPES.find(t => t.value === type)?.color || '#0d5ddf'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            onClick={e => e.stopPropagation()}
            className="relative bg-white w-full max-w-[640px] rounded-[10px] shadow-2xl overflow-hidden flex flex-col border-[3px] transition-all"
            style={{ borderColor: activeColor }}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <span className="text-[11px] font-roc uppercase tracking-[0.2em] text-gray-400">
                New Entry
              </span>
              <span className="text-[11px] font-roc uppercase tracking-wider text-gray-400 cursor-pointer hover:text-black" onClick={handleClose}>
                esc
              </span>
            </div>

            <div className="p-8 flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {TYPES.map(t => {
                    const isSelected = type === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className="px-5 py-2 rounded-full text-[12px] font-bold font-circular transition-all border select-none"
                        style={{
                          backgroundColor: isSelected ? t.color : 'transparent',
                          color: isSelected ? 'white' : '#9ca3af',
                          borderColor: isSelected ? t.color : '#e5e7eb',
                        }}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>

                <SpacePicker value={spaceId} onChange={setSpaceId} />
              </div>

              <div className="min-h-[220px]">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {type === 'link' && (
                    <div className="view-content flex flex-col gap-4">
                      <input
                        type="url"
                        autoFocus
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://"
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[18px] font-roc focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-link text-black"
                      />
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[14px] font-circular focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-link text-black"
                      />
                    </div>
                  )}

                  {type === 'note' && (
                    <div className="view-content flex flex-col gap-4">
                      <input
                        type="text"
                        autoFocus
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[18px] font-roc focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-note text-black"
                      />
                      <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Start writing..."
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[14px] font-circular focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-note min-h-[120px] text-black"
                      ></textarea>
                    </div>
                  )}

                  {type === 'quote' && (
                    <div className="view-content flex flex-col gap-4">
                      <textarea
                        autoFocus
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder='"The quote goes here"'
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[18px] italic font-roc focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-quote min-h-[100px] text-black"
                      ></textarea>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Author (optional)"
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[14px] font-circular focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-quote text-black"
                      />
                    </div>
                  )}

                  {type === 'image' && (
                    <div className="view-content flex flex-col gap-4">
                      {imagePreview ? (
                        <div className="relative rounded-[8px] overflow-hidden border-2 border-gray-100">
                          <img src={imagePreview} alt="preview" className="w-full h-48 object-cover"/>
                          <button
                            type="button"
                            onClick={() => { setImageFile(null); setImagePreview(null) }}
                            className="absolute top-2 right-2 bg-white/90 font-mono text-[10px] px-2 py-1 rounded-[4px] border border-black"
                          >
                            change
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-200 rounded-[8px] flex flex-col items-center justify-center gap-2 hover:border-[#faa200] transition-colors cursor-pointer bg-gray-50/50 min-h-[140px] select-none py-6"
                        >
                          <svg className="w-8 h-8 text-gray-300 group-hover:text-[#faa200] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                          <span className="text-[13px] font-bold font-circular text-gray-400 group-hover:text-[#faa200] transition-colors">
                            Drop an image here or click to upload
                          </span>
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden"/>
                      
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[14px] font-circular focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 input-focus-image text-black"
                      />
                    </div>
                  )}

                  {type === 'pdf' && (
                    <div className="view-content flex flex-col gap-4">
                      {pdfFile ? (
                        <div className="flex items-center gap-4 border-2 border-gray-100 rounded-[8px] p-4">
                          <div className="w-11 h-14 shrink-0 rounded-[4px] bg-[#9439f9] text-white flex items-end justify-center pb-1.5 text-[9px] font-bold font-circular tracking-wider shadow-[2px_2px_0px_black] border border-black">
                            PDF
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold font-circular text-black truncate">{pdfFile.name}</p>
                            <p className="text-[12px] font-circular text-gray-400">{formatSize(pdfFile.size)} · encrypted before it's stored</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPdfFile(null)}
                            className="bg-white font-mono text-[10px] px-2 py-1 rounded-[4px] border border-black"
                          >
                            change
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => pdfRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); setPdfDragOver(true) }}
                          onDragLeave={() => setPdfDragOver(false)}
                          onDrop={e => { e.preventDefault(); e.stopPropagation(); setPdfDragOver(false); choosePdf(e.dataTransfer.files?.[0]) }}
                          className={`w-full border-2 border-dashed rounded-[8px] flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer min-h-[140px] select-none py-6 ${pdfDragOver ? 'border-[#9439f9] bg-[#9439f9]/5' : 'border-gray-200 bg-gray-50/50 hover:border-[#9439f9]'}`}
                        >
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5 M12 17v-6 M9 14l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                          </svg>
                          <span className="text-[13px] font-bold font-circular text-gray-400">Drop a PDF here or click to choose</span>
                          <span className="text-[11px] font-circular text-gray-300">Every page becomes searchable · up to 50 MB</span>
                        </div>
                      )}
                      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" onChange={e => choosePdf(e.target.files?.[0])} className="hidden" />

                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Title (optional — we'll use the filename)"
                        className="w-full border-2 border-gray-100 rounded-[4px] p-4 text-[14px] font-circular focus:ring-0 focus:outline-none transition-all placeholder:text-gray-300 text-black focus:border-[#9439f9]"
                      />

                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={aiOptOut}
                          onChange={e => setAiOptOut(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-black"
                        />
                        <span className="text-[13px] font-circular text-gray-600 leading-snug">
                          <b className="text-black">Keep this PDF away from AI.</b> It's still encrypted and searchable by its text,
                          but never sent to an AI provider — so no summary or auto-tags.
                        </span>
                      </label>
                    </div>
                  )}

                  {error && <p className="text-[12.5px] text-red-600 font-circular">{error}</p>}
                </form>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end items-center gap-6 px-8 pb-8">
              <button
                type="button"
                onClick={handleClose}
                className="text-[13px] font-bold font-circular text-gray-400 hover:text-black transition-colors uppercase tracking-wider select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-10 py-4 bg-black text-white rounded-[4px] text-[14px] font-bold font-circular hover:bg-opacity-95 transition-all active:scale-95 uppercase tracking-widest shadow-[3px_3px_0px_rgba(0,0,0,0.2)] disabled:opacity-50 select-none"
                style={{ backgroundColor: activeColor }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

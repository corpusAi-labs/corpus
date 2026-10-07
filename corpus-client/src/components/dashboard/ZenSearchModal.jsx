import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemCard from './ItemCard.jsx'

/**
 * Ambient Square Dots Canvas
 * 8-12 small colorful square pixel dots scattered subtly across the canvas
 * connected by ultra-faint, low-opacity hairline threads (Corpus brand colors).
 */
function SquareDotsCanvas() {
  const dots = [
    { id: 'd1', x: 160, y: 150, size: 8, color: '#0d5ddf' }, // blue
    { id: 'd2', x: 380, y: 90,  size: 8, color: '#9439f9' }, // purple
    { id: 'd3', x: 490, y: 200, size: 8, color: '#259d27' }, // green
    { id: 'd4', x: 580, y: 280, size: 8, color: '#f74700' }, // orange
    { id: 'd5', x: 110, y: 440, size: 8, color: '#0d5ddf' }, // blue
    { id: 'd6', x: 330, y: 550, size: 8, color: '#259d27' }, // green
    { id: 'd7', x: 440, y: 640, size: 8, color: '#f74700' }, // orange
    { id: 'd8', x: 720, y: 680, size: 8, color: '#faa200' }, // yellow
    { id: 'd9', x: 1250, y: 110, size: 8, color: '#9439f9' }, // purple
    { id: 'd10', x: 1040, y: 260, size: 8, color: '#259d27' }, // green
    { id: 'd11', x: 1160, y: 310, size: 8, color: '#faa200' }, // yellow
    { id: 'd12', x: 920, y: 380,  size: 8, color: '#9439f9' }, // purple
    { id: 'd13', x: 800, y: 590,  size: 8, color: '#0d5ddf' }, // blue
    { id: 'd14', x: 1280, y: 700, size: 8, color: '#9439f9' }, // purple
  ]

  const lines = [
    { from: [160, 150], to: [490, 200] },
    { from: [490, 200], to: [580, 280] },
    { from: [110, 440], to: [330, 550] },
    { from: [330, 550], to: [490, 200] },
    { from: [330, 550], to: [440, 640] },
    { from: [1250, 110], to: [1040, 260] },
    { from: [1040, 260], to: [1160, 310] },
    { from: [1040, 260], to: [920, 380] },
    { from: [920, 380], to: [1280, 700] },
    { from: [800, 590], to: [1280, 700] },
  ]

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0">
      <svg
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
      >
        {/* Ultra-faint, low-opacity connecting hairline lines */}
        <g stroke="#040309" strokeWidth="1" strokeLinecap="round" opacity="0.06">
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.from[0]}
              y1={l.from[1]}
              x2={l.to[0]}
              y2={l.to[1]}
            />
          ))}
        </g>

        {/* Small colorful square pixel dots with subtle floating animation */}
        {dots.map((d, i) => (
          <motion.rect
            key={d.id}
            x={d.x - d.size / 2}
            y={d.y - d.size / 2}
            width={d.size}
            height={d.size}
            rx={1.5}
            fill={d.color}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 0.9,
              scale: 1,
              y: [0, (i % 2 === 0 ? -3 : 3), 0],
            }}
            transition={{
              opacity: { duration: 0.6, delay: i * 0.03 },
              y: { repeat: Infinity, duration: 5 + (i % 3), ease: 'easeInOut' },
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export default function ZenSearchModal({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  searchResults,
  allRecentItems = [],
  isLoading,
  onSelectItem,
  onDeleteItem,
}) {
  const inputRef = useRef(null)

  // Lock background scroll when Zen mode is active
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow
      const prevDocOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      const t = setTimeout(() => {
        inputRef.current?.focus()
      }, 350)

      return () => {
        document.body.style.overflow = prevBodyOverflow
        document.documentElement.style.overflow = prevDocOverflow
        clearTimeout(t)
      }
    }
  }, [isOpen])

  // ESC key to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const hasQuery = Boolean(searchQuery && searchQuery.trim())

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 bg-[#ecebe6] text-black flex flex-col justify-between overflow-hidden select-none"
          data-purpose="zen-search-overlay"
        >
          {/* Subtle grid background pattern matching Corpus */}
          <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" />

          {/* Ambient Square Dots Canvas */}
          <SquareDotsCanvas />

          {/* TOP BAR: Header with Corpus Logo and Back Button */}
          <header className="w-full relative z-30 px-6 sm:px-10 py-3.5 flex items-center justify-between border-b border-black/10 bg-[#ecebe6]/95">
            {/* Left: Logo & Back Button */}
            <div className="flex items-center gap-4">
              <div
                className="flex items-center cursor-pointer select-none"
                onClick={onClose}
                title="Return to dashboard"
              >
                <img src="/Frame 4.svg" alt="Corpus" className="h-7 sm:h-8 w-auto object-contain" />
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-1.5 border border-black/15 bg-white hover:bg-black hover:text-white rounded-[6px] text-[12px] font-circular font-semibold transition-all shadow-[1px_1px_0px_rgba(0,0,0,0.08)] hover:shadow-none cursor-pointer text-black"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
            </div>
          </header>

          {/* Top Subtle Blur Fade Vignette - Sent behind search bar (z-20), reduced range (h-9 / 36px), reduced blur (2px) */}
          {hasQuery && (
            <div
              className="pointer-events-none fixed top-[56px] left-0 right-0 h-9 z-20"
              style={{
                background: 'linear-gradient(to bottom, rgba(236,235,230,0.55) 0%, rgba(236,235,230,0) 100%)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                maskImage: 'linear-gradient(to bottom, black 10%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 100%)',
              }}
            />
          )}

          {/* Floating Search Bar When Query Active - Brought UP to z-50 ABOVE the blur vignette & cards */}
          {hasQuery && (
            <div className="fixed top-[70px] left-1/2 -translate-x-1/2 z-50 w-full max-w-[580px] px-4 pointer-events-none">
              <div className="w-full pointer-events-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    inputRef.current?.blur()
                  }}
                  className="w-full rounded-full border border-black/15 bg-white px-5 py-3 shadow-[0_6px_25px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] focus-within:shadow-[0_10px_35px_rgba(0,0,0,0.12)] focus-within:border-black/35 flex items-center gap-3.5 transition-all"
                >
                  <svg
                    className="w-4 h-4 text-black/35 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>

                  <input
                    ref={inputRef}
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by concept, vibe, or memory..."
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-black placeholder:text-black/35 font-circular font-medium"
                  />

                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-black text-sm font-mono px-1 cursor-pointer"
                    title="Clear"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA */}
          <main className={`flex-1 w-full overflow-y-auto px-4 sm:px-10 lg:px-14 relative z-10 min-h-0 flex flex-col ${hasQuery ? 'pt-24' : ''}`}>
            {!hasQuery ? (
              /* EMPTY CALM SPACE: Centered soft pill search bar in wide peaceful void */
              <div className="flex-1 w-full flex flex-col items-center justify-center -mt-12 px-4">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-[580px]"
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      inputRef.current?.blur()
                    }}
                    className="w-full rounded-full border border-black/15 bg-white px-5 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.09)] focus-within:shadow-[0_12px_36px_rgba(0,0,0,0.12)] focus-within:border-black/30 flex items-center gap-3.5 transition-all duration-200"
                  >
                    <svg
                      className="w-5 h-5 text-black/35 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>

                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by concept, vibe, or memory..."
                      className="flex-1 bg-transparent border-none outline-none text-[16px] text-black placeholder:text-black/35 font-circular font-medium"
                    />
                  </form>
                </motion.div>
              </div>
            ) : (
              /* WHEN TYPING: Matching Cards scrolling under floating search bar */
              <div className="w-full flex flex-col pb-32">
                {/* Status Bar */}
                <div className="flex items-center border-b border-black/10 pb-3 mb-6 font-mono text-[11px] uppercase tracking-wider text-black/50">
                  <span>
                    Found {searchResults?.length || 0} {searchResults?.length === 1 ? 'match' : 'matches'} for &ldquo;{searchQuery}&rdquo;
                  </span>
                </div>

                {/* Cards Grid */}
                {isLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-black/50">
                    <div className="w-7 h-7 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                    <p className="font-mono text-xs uppercase tracking-widest">Searching your mind...</p>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {searchResults.map((item) => (
                      <div
                        key={item._id}
                        className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.99]"
                      >
                        <ItemCard item={item} onClick={onSelectItem} onDelete={onDeleteItem} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 text-center text-black/40 font-circular text-[16px]">
                    No memories found matching &ldquo;{searchQuery}&rdquo;. Try another thought or keyword.
                  </div>
                )}
              </div>
            )}
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useState, useEffect, useRef } from 'react'

export default function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handle = setTimeout(() => { query.trim() ? onSearch(query.trim()) : onClear() }, 350)
    return () => clearTimeout(handle)
  }, [query])

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your archive…"
          className="w-full bg-white border border-line rounded-full px-4 py-2 text-[13px] text-ink placeholder:text-muted/70 focus:outline-none focus:border-accent/60 transition-colors"
        />
        {query && (
          <button onClick={() => { setQuery(''); onClear(); }} className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted hover:text-ink">
            clear
          </button>
        )}
      </div>
    </div>
  )
}

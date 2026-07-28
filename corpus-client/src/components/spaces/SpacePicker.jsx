import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSpaces } from '../../api/spaces.js'

export default function SpacePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { data } = useQuery({ queryKey: ['spaces'], queryFn: fetchSpaces })
  const spaces = data?.spaces || []
  const selected = spaces.find(s => s._id === value)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative group z-50" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black text-[12px] font-bold font-circular text-black hover:bg-gray-50 transition-all active:translate-x-[1px] active:translate-y-[1px] shadow-[2px_2px_0px_black] hover:shadow-none bg-white select-none"
      >
        {selected ? (
          <>
            <span className="w-2 h-2 rounded-full border border-black shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="truncate max-w-[100px]">{selected.name}</span>
          </>
        ) : (
          <span className="">No space</span>
        )}
        <svg fill="none" height="6" viewBox="0 0 10 6" width="10" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black rounded-[8px] shadow-[4px_4px_0px_black] z-[110] overflow-hidden py-1">
          <div className="px-4 py-2 text-[11px] font-roc uppercase tracking-wider text-gray-400 border-b border-gray-100 select-none">
            Select Space
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-[12px] font-circular hover:bg-gray-100 transition-colors text-black"
          >
            No space
          </button>
          {spaces.map(s => (
            <button
              key={s._id}
              type="button"
              onClick={() => { onChange(s._id); setOpen(false) }}
              className="w-full text-left px-4 py-2 flex items-center gap-2 font-circular hover:bg-gray-100 transition-colors text-black"
            >
              <span className="w-2 h-2 rounded-full border border-black shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          {spaces.length === 0 && (
            <p className="px-4 py-2 font-circular text-[10px] text-gray-400 select-none">No spaces yet</p>
          )}
        </div>
      )}
    </div>
  )
}

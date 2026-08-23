import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import ItemCard from './ItemCard.jsx'

export default function MasonryGrid({ items, onCardClick, onDelete, onLoadMore, hasMore, isLoading }) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && !isLoading) onLoadMore() },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, onLoadMore])

  if (!items.length && !isLoading) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-[20px] mb-2">Nothing here yet.</p>
        <p className="text-[14px] text-muted">Save your first link, note, or image to begin your archive.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        <AnimatePresence mode="popLayout">
          {items.map(item => (
            <ItemCard key={item._id} item={item} onClick={onCardClick} onDelete={onDelete} />
          ))}
        </AnimatePresence>
      </div>
      {isLoading && (
        <div className="flex justify-center py-8">
          <span className="font-mono text-[11px] text-muted uppercase tracking-wider">loading…</span>
        </div>
      )}
      <div ref={sentinelRef} className="h-1"/>
    </div>
  )
}

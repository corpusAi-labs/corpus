import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../../components/dashboard/Sidebar.jsx'
import MasonryGrid from '../../components/dashboard/MasonryGrid.jsx'
import DetailPanel from '../../components/dashboard/DetailPanel.jsx'
import { fetchItems, deleteItem } from '../../api/items.js'
import { fetchSpace, updateSpace, deleteSpace } from '../../api/spaces.js'
import ColorPicker from '../../components/spaces/ColorPicker.jsx'

export default function SpaceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  const { data: spaceData } = useQuery({
    queryKey: ['space', id],
    queryFn: () => fetchSpace(id),
  })
  const space = spaceData?.space

  const itemsQuery = useInfiniteQuery({
    queryKey: ['items', 'space', id],
    queryFn: ({ pageParam }) => fetchItems({ cursor: pageParam, spaceId: id }),
    initialPageParam: undefined,
    getNextPageParam: last => last.nextCursor || undefined,
  })

  const deleteMutation = useMutation({
    mutationFn: itemId => deleteItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['items', 'space', id] })
      const previous = queryClient.getQueryData(['items', 'space', id])
      queryClient.setQueryData(['items', 'space', id], (old) => {
        if (!old) return old
        return { ...old, pages: old.pages.map(p => ({ ...p, items: p.items.filter(i => i._id !== itemId) })) }
      })
      return { previous }
    },
    onError: (err, itemId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['items', 'space', id], ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['items', 'space', id] }),
  })

  const updateColorMutation = useMutation({
    mutationFn: (color) => updateSpace(id, { color }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['space', id] }),
  })

  const deleteSpaceMutation = useMutation({
    mutationFn: () => deleteSpace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      navigate('/spaces')
    },
  })

  const items = itemsQuery.data?.pages.flatMap(p => p.items) || []

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['items', 'space', id] })
  }, [queryClient, id])

  function handleDeleteSpace() {
    if (!confirm(`Delete "${space?.name}"? Items inside will stay in your archive.`)) return
    deleteSpaceMutation.mutate()
  }

  return (
    <div className="min-h-screen relative w-full">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar />

        <main className="relative z-10 flex-1 pt-[26px] pr-6 pb-10 min-w-0 pl-10" data-purpose="main-feed">
          <div className="flex justify-between items-center mb-12 relative z-30">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/spaces')}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors group back-btn"
              >
                <svg className="transition-transform group-hover:-translate-x-1" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="24">
                  <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
              </button>
              <span
                className="w-5 h-5 rounded-full border-2 border-black shrink-0"
                style={{ backgroundColor: space?.color || '#2E5BFF' }}
              />
              <h1 className="text-[48px] font-bold font-roc leading-none text-black">{space?.name || '…'}</h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowSettings(s => !s)}
                className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-black hover:bg-black hover:text-white transition-colors text-black font-bold text-[18px]"
              >
                ⚙
              </button>
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-12 bg-white border-2 border-black rounded-[8px] shadow-[4px_4px_0px_black] p-4 w-60 z-20"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-2">Change color</p>
                    <ColorPicker value={space?.color} onChange={c => updateColorMutation.mutate(c)} />
                    <button
                      onClick={handleDeleteSpace}
                      className="w-full mt-4 font-mono text-[11px] uppercase tracking-wide text-white bg-[#f74700] hover:bg-red-700 py-2 border-2 border-black rounded-[4px] shadow-[2px_2px_0px_black] hover:shadow-none translate-y-[-2px] hover:translate-y-0 active:translate-y-[2px] transition-all"
                    >
                      Delete Space
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-black pt-8 min-h-[400px]">
            {!itemsQuery.isLoading && items.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-serif italic text-[20px] mb-2 text-black">This space is empty.</p>
                <p className="text-[14px] text-gray-600">
                  Add items to this space from the save dialog or the detail panel.
                </p>
              </div>
            ) : (
              <MasonryGrid
                items={items}
                onCardClick={setSelectedItem}
                onDelete={itemId => deleteMutation.mutate(itemId)}
                onLoadMore={() => itemsQuery.fetchNextPage()}
                hasMore={itemsQuery.hasNextPage}
                isLoading={itemsQuery.isLoading}
              />
            )}
          </div>
        </main>
      </div>

      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={(itemId) => { deleteMutation.mutate(itemId); setSelectedItem(null) }}
          onUpdate={invalidate}
        />
      )}
    </div>
  )
}

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../components/dashboard/Sidebar.jsx'
import MasonryGrid from '../../components/dashboard/MasonryGrid.jsx'
import SaveComposer from '../../components/dashboard/SaveComposer.jsx'
import DetailPanel from '../../components/dashboard/DetailPanel.jsx'
import ZenSearchModal from '../../components/dashboard/ZenSearchModal.jsx'
import NoCreditsModal from '../../components/ui/NoCreditsModal.jsx'
import useAuthStore from '../../store/authStore.js'
import { fetchItems, searchItems as searchItemsApi, createItem, deleteItem, uploadImage, fetchAllTags } from '../../api/items.js'
import { getMeApi } from '../../api/auth.js'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { setCredits } = useAuthStore()

  const [activeType, setActiveType] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState('newest')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [noCredits, setNoCredits] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [isZenOpen, setIsZenOpen] = useState(false)
  const [duplicateAlert, setDuplicateAlert] = useState(null)

  useEffect(() => {
    if (!duplicateAlert) return
    const timer = setTimeout(() => setDuplicateAlert(null), 5000)
    return () => clearTimeout(timer)
  }, [duplicateAlert])

  // Parse view from URL search params
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const currentView = queryParams.get('view') || 'dashboard'

  // Handle opening composer via query params (e.g. from spaces/drift routes)
  useEffect(() => {
    if (queryParams.get('openComposer') === 'true') {
      setIsComposerOpen(true)
      const cleanParams = new URLSearchParams(location.search)
      cleanParams.delete('openComposer')
      const searchStr = cleanParams.toString()
      navigate(location.pathname + (searchStr ? `?${searchStr}` : ''), { replace: true })
    }
  }, [queryParams, location.pathname, navigate])

  // Get user data from API
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: getMeApi,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  })
  // Access directly in your component without extra local state:
  const credits = data?.user?.credits

  
  const itemsQuery = useInfiniteQuery({
    queryKey: ['items', activeType, activeTag, sortOption],
    queryFn: ({ pageParam = undefined }) =>
      fetchItems({ cursor: pageParam, type: activeType || undefined, tag: activeTag || undefined, sort: sortOption }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: !searchQuery,
  })

  const searchResultsQuery = useQuery({
    queryKey: ['search', searchQuery, sortOption, activeType, activeTag, isZenOpen],
    queryFn: () => searchItemsApi(searchQuery, sortOption, {
      type: activeType || undefined,
      tag: activeTag || undefined,
      mode: isZenOpen ? 'vector' : undefined,
    }),
    enabled: !!searchQuery,
  })

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: fetchAllTags,
    staleTime: 60000,
  })

  const saveMutation = useMutation({
    mutationFn: async ({ type, url, content, title, imageFile, spaceId }) => {
      if (type === 'image') {
        const { url: uploadedUrl } = await uploadImage(imageFile)
        return createItem({ type, thumbnailUrl: uploadedUrl, title, spaceId })
      }
      if (type === 'link') return createItem({ type, url, spaceId })
      return createItem({ type, content, title, spaceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setIsComposerOpen(false)
    },
    onError: (err) => {
      if (err?.response?.status === 402) {
        setIsComposerOpen(false)
        setNoCredits(true)
        setCredits(0)
      } else if (err?.response?.status === 409) {
        const item = err?.response?.data?.item
        setDuplicateAlert(item || true)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['items'] })
      await queryClient.cancelQueries({ queryKey: ['search'] })
      await queryClient.cancelQueries({ queryKey: ['tags'] })
      const previousItems = queryClient.getQueriesData({ queryKey: ['items'] })
      const previousSearch = queryClient.getQueriesData({ queryKey: ['search'] })
      queryClient.setQueriesData({ queryKey: ['items'] }, (old) => {
        if (!old) return old
        return { ...old, pages: old.pages.map(p => ({ ...p, items: p.items.filter(i => i._id !== id) })) }
      })
      queryClient.setQueriesData({ queryKey: ['search'] }, (old) => {
        if (!old) return old
        return { ...old, items: old.items.filter(i => i._id !== id) }
      })
      return { previousItems, previousSearch }
    },
    onError: (err, id, ctx) => {
      ctx?.previousItems?.forEach(([k, d]) => queryClient.setQueryData(k, d))
      ctx?.previousSearch?.forEach(([k, d]) => queryClient.setQueryData(k, d))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['search'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
    queryClient.invalidateQueries({ queryKey: ['search'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
  }, [queryClient])

  const [isSortOpen, setIsSortOpen] = useState(false)

  const isSearching = !!searchQuery
  const allPages = itemsQuery.data?.pages.flatMap(p => p.items) || []
  const displayedItems = isSearching ? searchResultsQuery.data?.items || [] : allPages
  const isLoading = isSearching ? searchResultsQuery.isLoading : itemsQuery.isLoading

  // Dynamic tags extraction
  const allTags = useMemo(() => {
    return tagsQuery.data?.tags || []
  }, [tagsQuery.data])

  // Alphabetical tags grouping
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return allTags
    const q = tagSearchQuery.toLowerCase()
    return allTags.filter(tag => tag && tag.toLowerCase().includes(q))
  }, [allTags, tagSearchQuery])

  const groupedTags = useMemo(() => {
    const groups = {}
    filteredTags.forEach(tag => {
      if (!tag) return
      const firstLetter = tag.charAt(0).toUpperCase()
      if (!groups[firstLetter]) groups[firstLetter] = []
      groups[firstLetter].push(tag)
    })
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort()
      return acc
    }, {})
  }, [filteredTags])

  function handleTypeChange(val) {
    setActiveType(val)
    setActiveTag('')
    setSearchQuery('')
    queryClient.removeQueries({ queryKey: ['items'] })
  }

  function handleTagChange(val) {
    setActiveTag(val)
    setActiveType('')
    setSearchQuery('')
    queryClient.removeQueries({ queryKey: ['items'] })
    // Return to feed when selecting a tag
    navigate('/dashboard')
  }

  const FILTERS = [
    { value: '', label: 'Everything', color: '#9439f9' },
    { value: 'note', label: 'Notes', color: '#f74700' },
    { value: 'quote', label: 'Quotes', color: '#259d27' },
    { value: 'link', label: 'Links', color: '#0d5ddf' },
    { value: 'image', label: 'Images', color: '#faa200' },
  ]

  return (
    <div className="min-h-screen relative w-full">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      <div className="relative z-10 flex min-h-screen w-full">
        <Sidebar onOpenComposer={() => setIsComposerOpen(true)} />

        <main className="relative z-10 flex-1 pt-[26px] pr-6 pb-10 min-w-0 pl-10" data-purpose="main-feed">
          {currentView === 'tags' ? (
             /* TAGS VIEW */
            <div className="view-content" id="view-tags">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors group back-btn"
                  >
                    <svg className="transition-transform group-hover:-translate-x-1" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="24">
                      <path d="M19 12H5M12 19l-7-7 7-7"></path>
                    </svg>
                  </button>
                  <h1 className="text-[48px] font-bold font-roc leading-none">All Tags</h1>
                </div>

                {/* Real-time Tag Search Bar */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="Search tags..."
                    className="w-full px-4 py-2 border-2 border-black rounded-[4px] text-[14px] font-circular focus:outline-none focus:ring-0 shadow-[3px_3px_0px_black] focus:shadow-none transition-all placeholder:text-gray-400 bg-white"
                  />
                  {tagSearchQuery && (
                    <button
                      onClick={() => setTagSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[16px] font-bold text-gray-400 hover:text-black"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-8 border-t border-black pt-8 relative">
                <div className="absolute top-[-1px] left-[-40px] w-[40px] h-[1px] bg-black"></div>
                 {Object.keys(groupedTags).length === 0 ? (
                  <div className="py-12 text-center text-[15px] font-circular text-gray-500">
                    No tags found. Add tags to your notes and links to see them here!
                  </div>
                ) : (
                  Object.keys(groupedTags).map((letter, letterIdx) => {
                    const tags = groupedTags[letter]
                    return (
                      <div key={letter} className="w-full flex flex-col gap-4">
                        {/* Section Header */}
                        <div className="flex items-center gap-4 select-none">
                          <h2 className="text-[16px] font-bold font-roc uppercase tracking-widest text-black">
                            {letter}
                          </h2>
                          <div className="flex-1 h-[2px] bg-black"></div>
                        </div>

                        {/* Tags Grid (8 columns on large screens) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-y-4 pt-2">
                          {tags.map((tag, idx) => {
                            // Check if this tag is the last column in its row of 8 to omit border-r
                            const isLastInRow = (idx + 1) % 8 === 0 || idx === tags.length - 1
                            return (
                              <div
                                key={tag}
                                className={`px-3 flex flex-col justify-center min-h-[36px] ${
                                  !isLastInRow ? 'border-r border-black/10' : ''
                                }`}
                              >
                                <span
                                  onClick={() => handleTagChange(tag)}
                                  className="text-[15px] font-circular font-semibold text-black hover:text-[#259d27] cursor-pointer truncate block"
                                  title={tag}
                                >
                                  {tag}
                                </span>
                              </div>
                            )
                          })}
                        </div>

                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (             /* DASHBOARD VIEW */
            <div className="view-content" id="view-dashboard">
              <div className="mb-1 min-h-[72px] flex items-center justify-between gap-4" data-purpose="hero-heading">
                <div className="flex-1 flex items-center min-w-0">
                  {isSearchFocused || searchQuery ? (
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => { if (!searchQuery) setIsSearchFocused(false) }}
                      autoFocus
                      placeholder="Search your archive..."
                      className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-[48px] leading-tight font-roc text-black placeholder:text-gray-400 font-bold"
                    />
                  ) : (
                    <h1
                      onClick={() => setIsSearchFocused(true)}
                      className="search-heading text-[48px] leading-tight cursor-text flex flex-wrap font-roc select-none"
                    >
                      <span>Search</span><span> your</span><span> archive...</span>
                    </h1>
                  )}
                </div>

                {/* Connected Idea Nodes Round Button with shared layout animation */}
                <motion.button
                  layoutId="deep-recall-portal-icon"
                  transition={{
                    duration: 1.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() => setIsZenOpen(true)}
                  title="Deep Recall — Connected Archive"
                  className="relative w-[48px] h-[48px] rounded-full cursor-pointer group flex items-center justify-center select-none flex-shrink-0"
                  data-purpose="deep-recall-btn"
                >
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#EE4123] via-[#0d5ddf] to-[#27A504] opacity-35 blur-md group-hover:opacity-75 transition-opacity"></div>
                  <div className="relative z-10 w-full h-full rounded-full bg-white border-2 border-black shadow-[3px_3px_0px_black] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-all flex items-center justify-center overflow-hidden">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:scale-110">
                      <path d="M6 16L12 8L18 14" stroke="#040309" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 8V18" stroke="#040309" strokeWidth="1.6" strokeLinecap="round" />
                      <circle cx="6" cy="16" r="3" fill="#0d5ddf" stroke="#040309" strokeWidth="1" />
                      <circle cx="12" cy="8" r="3.4" fill="#EE4123" stroke="#040309" strokeWidth="1" />
                      <circle cx="18" cy="14" r="3" fill="#27A504" stroke="#040309" strokeWidth="1" />
                      <circle cx="12" cy="18" r="2.6" fill="#E09A29" stroke="#040309" strokeWidth="1" />
                    </svg>
                  </div>
                </motion.button>
              </div>

              <div className="border-t border-black pt-4 mb-7 flex justify-between items-center flex-wrap gap-4 relative" data-purpose="filter-bar">
                <div className="absolute top-[-1px] left-[-40px] w-[40px] h-[1px] bg-black"></div>
                <div className="flex gap-4 flex-wrap">
                  {FILTERS.map(f => {
                    const isActive = activeType === f.value && !activeTag
                    return (
                      <button
                        key={f.value}
                        onClick={() => handleTypeChange(f.value)}
                        className="filter-btn px-[29px] py-[7px] rounded-[4px] text-[14px] font-bold font-circular text-white transition-all duration-150"
                        style={{
                          backgroundColor: isActive ? 'black' : f.color,
                        }}
                        data-active={isActive ? 'true' : 'false'}
                      >
                        {f.label}
                      </button>
                    )
                  })}

                  {activeTag && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">Filtered by tag:</span>
                      <button
                        onClick={() => handleTagChange('')}
                        className="filter-btn px-4 py-1.5 rounded-[4px] text-[12px] font-bold font-circular text-white bg-black hover:bg-gray-900 transition-all flex items-center gap-1.5"
                      >
                        #{activeTag}
                        <span className="text-[14px] leading-none">×</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 relative" data-purpose="sort-control">
                  <span className="text-[13px] font-bold font-circular uppercase tracking-wider text-black/50">Sort:</span>
                  <div className="relative">
                    <button
                      onClick={() => setIsSortOpen(!isSortOpen)}
                      className="bg-white border-2 border-black rounded-[4px] px-3 py-1.5 text-[13px] font-bold font-circular shadow-[3px_3px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_black] transition-all cursor-pointer flex items-center gap-1.5 text-black min-w-[95px] justify-between"
                    >
                      <span className="capitalize">{sortOption}</span>
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {isSortOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setIsSortOpen(false)}
                        />
                        <div className="absolute right-0 mt-1.5 w-[110px] bg-white border-2 border-black rounded-[4px] shadow-[4px_4px_0px_black] z-50 overflow-hidden font-circular text-[13px]">
                          <button
                            onClick={() => {
                              setSortOption('newest')
                              setIsSortOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 font-bold hover:bg-gray-100 transition-colors ${
                              sortOption === 'newest' ? 'bg-black text-white hover:bg-black/90' : 'text-black'
                            }`}
                          >
                            Newest
                          </button>
                          <button
                            onClick={() => {
                              setSortOption('oldest')
                              setIsSortOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 border-t-2 border-black font-bold hover:bg-gray-100 transition-colors ${
                              sortOption === 'oldest' ? 'bg-black text-white hover:bg-black/90' : 'text-black'
                            }`}
                          >
                            Oldest
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isSearching && (
                <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500 mb-4">
                  {displayedItems.length} result{displayedItems.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              )}

              <MasonryGrid
                items={displayedItems}
                onCardClick={setSelectedItem}
                onDelete={id => deleteMutation.mutate(id)}
                onLoadMore={() => itemsQuery.fetchNextPage()}
                hasMore={!isSearching && itemsQuery.hasNextPage}
                isLoading={isLoading}
                isSaving={saveMutation.isPending}
              />
            </div>
          )}
        </main>
      </div>

      <SaveComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSave={payload => saveMutation.mutateAsync(payload)}
        isSaving={saveMutation.isPending}
      />

      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={(id) => { deleteMutation.mutate(id); setSelectedItem(null) }}
          onUpdate={invalidate}
        />
      )}

      <NoCreditsModal isOpen={noCredits} onClose={() => setNoCredits(false)} />

      <ZenSearchModal
        isOpen={isZenOpen}
        onClose={() => setIsZenOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResultsQuery.data?.items}
        allRecentItems={allPages}
        isLoading={searchResultsQuery.isLoading}
        onSelectItem={(item) => setSelectedItem(item)}
        onDeleteItem={(id) => deleteMutation.mutate(id)}
      />

      {/* Duplicate Alert Toast */}
      <AnimatePresence>
        {duplicateAlert && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-white border-2 border-black px-4 py-2.5 rounded-[4px] shadow-[4px_4px_0px_black] flex items-center gap-3 font-circular"
          >
            <span className="text-[13px] font-bold text-black">
              Already saved in your archive!
            </span>
            {duplicateAlert?._id && (
              <button
                onClick={() => {
                  setSelectedItem(duplicateAlert)
                  setDuplicateAlert(null)
                }}
                className="px-2.5 py-1 text-[12px] font-bold bg-[#fff8f4] border border-black rounded-[4px] shadow-[1px_1px_0px_black] hover:bg-black hover:text-white transition-all ml-1 cursor-pointer"
              >
                View Item
              </button>
            )}
            <button
              onClick={() => setDuplicateAlert(null)}
              className="text-gray-400 hover:text-black font-bold text-[14px] leading-none ml-2 cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

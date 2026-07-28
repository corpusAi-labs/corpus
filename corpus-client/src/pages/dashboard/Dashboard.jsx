import { useState, useCallback, useMemo, useEffect } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../../components/dashboard/Sidebar.jsx'
import MasonryGrid from '../../components/dashboard/MasonryGrid.jsx'
import SaveComposer from '../../components/dashboard/SaveComposer.jsx'
import DetailPanel from '../../components/dashboard/DetailPanel.jsx'
import NoCreditsModal from '../../components/ui/NoCreditsModal.jsx'
import useAuthStore from '../../store/authStore.js'
import { fetchItems, searchItems as searchItemsApi, createItem, deleteItem, uploadImage } from '../../api/items.js'
import { getMeApi } from '../../api/auth.js'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { setCredits } = useAuthStore()

  const [activeType, setActiveType] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [noCredits, setNoCredits] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)

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

  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await getMeApi()
      setCredits(data.user.credits)
      return data
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  })

  const itemsQuery = useInfiniteQuery({
    queryKey: ['items', activeType, activeTag],
    queryFn: ({ pageParam = undefined }) =>
      fetchItems({ cursor: pageParam, type: activeType || undefined, tag: activeTag || undefined }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: !searchQuery,
  })

  const searchResultsQuery = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => searchItemsApi(searchQuery),
    enabled: !!searchQuery,
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
      setIsComposerOpen(false)
    },
    onError: (err) => {
      if (err?.response?.status === 402) {
        setIsComposerOpen(false)
        setNoCredits(true)
        setCredits(0)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['items'] })
      await queryClient.cancelQueries({ queryKey: ['search'] })
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
    },
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
    queryClient.invalidateQueries({ queryKey: ['search'] })
  }, [queryClient])

  const isSearching = !!searchQuery
  const allPages = itemsQuery.data?.pages.flatMap(p => p.items) || []
  const displayedItems = isSearching ? searchResultsQuery.data?.items || [] : allPages
  const isLoading = isSearching ? searchResultsQuery.isLoading : itemsQuery.isLoading

  // Dynamic tags extraction
  const allTags = useMemo(() => {
    const tagSet = new Set()
    allPages.forEach(item => item.tags?.forEach(t => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [allPages])

  // Alphabetical tags grouping
  const groupedTags = useMemo(() => {
    const groups = {}
    allTags.forEach(tag => {
      if (!tag) return
      const firstLetter = tag.charAt(0).toUpperCase()
      if (!groups[firstLetter]) groups[firstLetter] = []
      groups[firstLetter].push(tag)
    })
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort()
      return acc
    }, {})
  }, [allTags])

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
  ]

  return (
    <div className="min-h-screen relative w-full">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      <div className="relative z-10 flex min-h-screen overflow-x-hidden max-w-[1440px] mx-auto">
        <Sidebar onOpenComposer={() => setIsComposerOpen(true)} />

        <main className="relative z-10 flex-1 pt-[26px] pr-6 pb-10 min-w-0 pl-10" data-purpose="main-feed">
          {currentView === 'tags' ? (
            /* TAGS VIEW */
            <div className="view-content" id="view-tags">
              <div className="mb-6 flex items-center gap-4">
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

              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 border-t border-black pt-8 relative">
                <div className="absolute top-[-1px] left-[-40px] w-[40px] h-[1px] bg-black"></div>
                {Object.keys(groupedTags).length === 0 ? (
                  <div className="col-span-full py-12 text-center text-[15px] font-circular text-gray-500">
                    No tags found. Add tags to your notes and links to see them here!
                  </div>
                ) : (
                  Object.keys(groupedTags).map(letter => (
                    <div key={letter} className="flex flex-col gap-4">
                      <h2 className="text-[14px] font-bold font-roc uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-2">
                        {letter}
                      </h2>
                      <div className="flex flex-col gap-2">
                        {groupedTags[letter].map(tag => (
                          <span
                            key={tag}
                            onClick={() => handleTagChange(tag)}
                            className="text-[15px] font-circular font-medium hover:text-[#259d27] cursor-pointer truncate"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* DASHBOARD VIEW */
            <div className="view-content" id="view-dashboard">
              <div className="mb-1 h-[72px] flex items-center" data-purpose="hero-heading">
                {isSearchFocused || searchQuery ? (
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setIsSearchFocused(false) }}
                    autoFocus
                    placeholder="Search in my memory..."
                    className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-[48px] leading-tight font-roc text-black placeholder:text-gray-400 font-bold"
                  />
                ) : (
                  <h1
                    onClick={() => setIsSearchFocused(true)}
                    className="search-heading text-[48px] leading-tight cursor-text flex flex-wrap font-roc select-none"
                  >
                    <span>Search</span><span> in</span><span> my</span><span> memory...</span>
                  </h1>
                )}
              </div>

              <div className="border-t border-black pt-4 mb-7 flex gap-4 flex-wrap relative" data-purpose="filter-bar">
                <div className="absolute top-[-1px] left-[-40px] w-[40px] h-[1px] bg-black"></div>
                {FILTERS.map(f => {
                  const isActive = activeType === f.value && !activeTag
                  return (
                    <button
                      key={f.value}
                      onClick={() => handleTypeChange(f.value)}
                      className="filter-btn px-[29px] py-[7px] rounded-[4px] text-[14px] font-bold font-circular text-white transition-all duration-150"
                      style={{
                        backgroundColor: isActive ? 'black' : f.color,
                        boxShadow: isActive ? 'none' : '3px 3px 0px black',
                        transform: isActive ? 'translate(3px, 3px)' : 'none',
                        color: 'white',
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
    </div>
  )
}

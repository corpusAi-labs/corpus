import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/dashboard/Sidebar.jsx'
import SpaceCard from '../../components/spaces/SpaceCard.jsx'
import CreateSpaceModal from '../../components/spaces/CreateSpaceModal.jsx'
import { fetchSpaces, createSpace } from '../../api/spaces.js'

export default function SpacesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: fetchSpaces,
  })

  const createMutation = useMutation({
    mutationFn: createSpace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spaces'] }),
  })

  const spaces = data?.spaces || []

  return (
    <div className="min-h-screen relative w-full">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      <div className="relative z-10 flex min-h-screen overflow-x-hidden max-w-[1440px] mx-auto">
        <Sidebar />

        <main className="relative z-10 flex-1 pt-[26px] pr-6 pb-10 min-w-0 pl-10" data-purpose="main-feed">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors group back-btn"
              >
                <svg className="transition-transform group-hover:-translate-x-1" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="24">
                  <path d="M19 12H5M12 19l-7-7 7-7"></path>
                </svg>
              </button>
              <h1 className="text-[48px] font-bold font-roc leading-none text-black">All Spaces</h1>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 rounded-full border-2 border-black text-[12px] font-bold font-circular text-black hover:bg-black hover:text-white transition-all flex items-center gap-2 group shadow-[2px_2px_0px_black] hover:shadow-none translate-y-[-2px] hover:translate-y-0 bg-white"
            >
              <span className="w-2 h-2 rounded-full border border-black group-hover:border-white bg-[#faa200]"></span>
              CREATE A NEW SPACE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-16 border-t border-black pt-16 relative pr-12 min-h-[400px]">
            <div className="absolute top-[-1px] left-[-40px] w-[40px] h-[1px] bg-black"></div>
            {isLoading ? (
              <div className="col-span-full py-12 text-center text-[14px] font-circular text-gray-500">
                Loading spaces…
              </div>
            ) : spaces.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <p className="font-serif text-[20px] mb-2 text-black">No spaces yet.</p>
                <p className="text-[14px] text-gray-600 mb-6">Create one to start organizing your archive.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="font-mono text-[12px] uppercase tracking-wide bg-black text-white px-5 py-2.5 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Create a space
                </button>
              </div>
            ) : (
              spaces.map(space => (
                <SpaceCard key={space._id} space={space} />
              ))
            )}
          </div>
        </main>
      </div>

      <CreateSpaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={payload => createMutation.mutateAsync(payload)}
      />
    </div>
  )
}

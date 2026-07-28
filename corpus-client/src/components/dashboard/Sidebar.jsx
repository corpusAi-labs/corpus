import { useAuth } from '../../hooks/useAuth.js'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore.js'

export default function Sidebar({ onOpenComposer }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const credits = useAuthStore(s => s.credits)

  const creditsLeft = credits ?? user?.credits ?? 0

  // Determine active view to set data-view-active
  const queryParams = new URLSearchParams(location.search)
  const isTagsView = queryParams.get('view') === 'tags'
  const isDashboardRoute = location.pathname === '/dashboard' || location.pathname === '/'
  const isSpacesRoute = location.pathname.startsWith('/spaces')
  const isDriftRoute = location.pathname.startsWith('/drift')

  let activeView = 'dashboard'
  if (isSpacesRoute) {
    activeView = 'spaces'
  } else if (isTagsView) {
    activeView = 'tags'
  } else if (isDriftRoute) {
    activeView = 'drift'
  }

  function handleSaveClick() {
    if (onOpenComposer) {
      onOpenComposer()
    } else {
      navigate('/dashboard?openComposer=true')
    }
  }

  function handleNav(view) {
    if (view === 'dashboard') {
      navigate('/dashboard')
    } else if (view === 'spaces') {
      navigate('/spaces')
    } else if (view === 'tags') {
      navigate('/dashboard?view=tags')
    } else if (view === 'drift') {
      navigate('/drift')
    }
  }

  return (
    <aside
      className="flex flex-col gap-[14px] p-[18px] w-[158px] shrink-0 min-h-screen border-r border-black relative z-20"
      data-purpose="sidebar-navigation"
      data-view-active={activeView}
      id="main-sidebar"
    >
      <h1
        className="text-[32px] font-bold leading-none mb-1 font-roc cursor-pointer select-none"
        onClick={() => handleNav('dashboard')}
      >
        corpus.
      </h1>

      {/* Save Button */}
      <div
        className="rounded-[10px] h-[128px] w-[122px] flex items-center justify-center cursor-pointer border-[3px] border-[#0d5ddf] bg-white transition-all active:scale-95 group z-50"
        data-purpose="save-action"
        id="sidebar-save-btn"
        onClick={handleSaveClick}
      >
        <span className="text-[14px] font-bold text-[#0d5ddf] font-circular transition-colors" id="save-btn-text">
          Save
        </span>
      </div>

      {/* Nav Card: Spaces */}
      <div
        className="side-nav-card relative overflow-hidden rounded-[10px] w-[122px] h-[128px] cursor-pointer select-none group z-50"
        data-active={activeView === 'spaces' ? 'true' : 'false'}
        data-purpose="nav-item"
        id="nav-spaces-btn"
        onClick={() => handleNav('spaces')}
      >
        <div className="absolute inset-0 bg-[#faa200]"></div>
        <div className="wave-container absolute inset-0 wave-layer-0 pointer-events-none" style={{ zIndex: 1 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 15 C 30 10 70 20 100 15 V 100 H 0 Z" fill="#0d5ddf"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-1 pointer-events-none" style={{ zIndex: 2 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 12 C 40 18 60 8 100 12 V 100 H 0 Z" fill="#9439f9"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-2 pointer-events-none" style={{ zIndex: 3 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 14 C 20 10 80 18 100 14 V 100 H 0 Z" fill="#f74700"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-3 pointer-events-none" style={{ zIndex: 4 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 10 C 35 5 65 15 100 10 V 100 H 0 Z" fill="#faa200"></path>
          </svg>
        </div>
        <div className="nav-content absolute inset-0 flex flex-col justify-between p-3 z-10 font-circular text-white">
          <div className="flex justify-between items-start">
            <span className="text-[14px] font-bold leading-none">01</span>
            <svg className="nav-icon" fill="none" height="9" viewBox="0 0 9 9" width="9">
              <path d="M1 8L8 1M8 1H2M8 1V7" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4"></path>
            </svg>
          </div>
          <span className="text-[14px] font-bold text-center block">Spaces</span>
        </div>
      </div>

      {/* Nav Card: Drifts */}
      <div
        className="side-nav-card relative overflow-hidden rounded-[10px] w-[122px] h-[128px] cursor-pointer select-none group z-50"
        data-active={activeView === 'drift' ? 'true' : 'false'}
        data-purpose="nav-item"
        onClick={() => handleNav('drift')}
      >
        <div className="absolute inset-0 bg-[#f74700]"></div>
        <div className="wave-container absolute inset-0 wave-layer-0 pointer-events-none" style={{ zIndex: 1 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 15 C 30 10 70 20 100 15 V 100 H 0 Z" fill="#0d5ddf"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-1 pointer-events-none" style={{ zIndex: 2 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 12 C 40 18 60 8 100 12 V 100 H 0 Z" fill="#faa200"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-2 pointer-events-none" style={{ zIndex: 3 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 14 C 20 10 80 18 100 14 V 100 H 0 Z" fill="#259d27"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-3 pointer-events-none" style={{ zIndex: 4 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 10 C 35 5 65 15 100 10 V 100 H 0 Z" fill="#f74700"></path>
          </svg>
        </div>
        <div className="nav-content absolute inset-0 flex flex-col justify-between p-3 z-10 font-circular text-white">
          <div className="flex justify-between items-start">
            <span className="text-[14px] font-bold leading-none">02</span>
            <svg className="nav-icon" fill="none" height="9" viewBox="0 0 9 9" width="9">
              <path d="M1 8L8 1M8 1H2M8 1V7" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4"></path>
            </svg>
          </div>
          <span className="text-[14px] font-bold text-center block">Drifts</span>
        </div>
      </div>

      {/* Nav Card: Tags */}
      <div
        className="side-nav-card relative overflow-hidden rounded-[10px] w-[122px] h-[128px] cursor-pointer select-none group z-50"
        data-active={activeView === 'tags' ? 'true' : 'false'}
        data-purpose="nav-item"
        id="nav-tags-btn"
        onClick={() => handleNav('tags')}
      >
        <div className="absolute inset-0 bg-[#259d27]"></div>
        <div className="wave-container absolute inset-0 wave-layer-0 pointer-events-none" style={{ zIndex: 1 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 15 C 30 10 70 20 100 15 V 100 H 0 Z" fill="#0d5ddf"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-1 pointer-events-none" style={{ zIndex: 2 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 12 C 40 18 60 8 100 12 V 100 H 0 Z" fill="#faa200"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-2 pointer-events-none" style={{ zIndex: 3 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 14 C 20 10 80 18 100 14 V 100 H 0 Z" fill="#f74700"></path>
          </svg>
        </div>
        <div className="wave-container absolute inset-0 wave-layer-3 pointer-events-none" style={{ zIndex: 4 }}>
          <svg className="absolute bottom-[-2px] left-0 w-full h-[120%]" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M 0 10 C 35 5 65 15 100 10 V 100 H 0 Z" fill="#259d27"></path>
          </svg>
        </div>
        <div className="nav-content absolute inset-0 flex flex-col justify-between p-3 z-10 font-circular text-white">
          <div className="flex justify-between items-start">
            <span className="text-[14px] font-bold leading-none">03</span>
            <svg className="nav-icon" fill="none" height="9" viewBox="0 0 9 9" width="9">
              <path d="M1 8L8 1M8 1H2M8 1V7" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4"></path>
            </svg>
          </div>
          <span className="text-[14px] font-bold text-center block">Tags</span>
        </div>
      </div>

      {/* Small Cards */}
      <div
        className="side-nav-card relative overflow-hidden rounded-[10px] w-[122px] h-[55px] cursor-pointer select-none group z-50"
        data-purpose="nav-item"
        onClick={() => navigate('/pricing')}
      >
        <div className="absolute inset-0 bg-[#9439f9] transition-colors duration-300 group-hover:bg-[#822cd9]"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white font-circular leading-none gap-0.5">
          <span className="text-[12px] font-bold opacity-80 uppercase tracking-wider">Saves</span>
          <span className="text-[15px] font-bold">{creditsLeft}</span>
        </div>
      </div>

      <div
        className="side-nav-card relative overflow-hidden rounded-[10px] w-[122px] h-[38px] cursor-pointer select-none group transition-all duration-200 active:scale-95 z-50"
        data-purpose="nav-item"
        onClick={logout}
      >
        <div className="absolute inset-0 bg-black transition-colors duration-300 group-hover:bg-[#1a1a1a]"></div>
        <div className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-105">
          <span className="text-[14px] font-bold text-white font-circular">Sign Out</span>
        </div>
      </div>

      <div className="side-nav-card relative overflow-hidden rounded-[10px] w-[122px] h-[38px] cursor-pointer select-none group z-50" data-purpose="nav-item">
        <div className="absolute inset-0 bg-black transition-colors duration-300 group-hover:bg-[#1a1a1a]"></div>
        <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
          <span className="text-[14px] font-bold text-white font-circular transition-all duration-300 group-hover:-translate-y-10">Follow on</span>
          <div className="absolute flex gap-3 translate-y-10 transition-all duration-300 group-hover:translate-y-0">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259 0.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
            </svg>
            <svg class="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
            </svg>
          </div>
        </div>
      </div>
    </aside>
  )
}

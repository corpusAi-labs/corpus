import { useAuth } from '../../hooks/useAuth.js'
import { useNavigate, useLocation } from 'react-router-dom'
import { FollowButton } from '../landing/Sidebar.jsx'

export default function Sidebar({ onOpenComposer }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const creditsLeft = user?.credits ?? 0

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
      className="flex flex-col gap-[14px] p-[18px] w-[158px] shrink-0 h-screen sticky top-0 border-r border-black relative z-20 overflow-y-auto scrollbar-none bg-[#fff8f4]"
      data-purpose="sidebar-navigation"
      data-view-active={activeView}
      id="main-sidebar"
    >
      <div
        className="mb-2 cursor-pointer select-none px-1"
        onClick={() => handleNav('dashboard')}
      >
        <img src="/Frame 4.svg" alt="Corpus" className="h-8 w-auto object-contain" />
      </div>

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
        className="side-nav-card relative overflow-hidden rounded-[10px] w-full h-[38px] cursor-pointer select-none group transition-all duration-200 z-50 shrink-0"
        data-purpose="nav-item"
        onClick={logout}
      >
        <div className="absolute inset-0 bg-black"></div>
        <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
        <div className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-105">
          <span className="text-[13px] font-bold text-white font-circular uppercase tracking-wider">Sign Out</span>
        </div>
      </div>

      <FollowButton className="w-full z-50" />
    </aside>
  )
}

import { Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore.js'

export default function Navbar() {
  const { user } = useAuthStore()

  return (
    <header className="border-b border-line bg-[#fff8f4]">
      <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex items-center no-underline">
            <img src="/Frame 4.svg" alt="Corpus" className="h-7 w-auto object-contain" />
          </Link>
          <span className="font-mono text-[10px] text-muted hidden sm:inline">
            / secondary memory
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 font-mono text-[12px] uppercase tracking-wide text-muted">
          <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
          <a href="#stack-section-trigger" className="hover:text-ink transition-colors">Features</a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/dashboard"
              className="font-mono text-[12px] uppercase tracking-wide bg-ink text-paper px-4 py-2 rounded-sm font-bold transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="font-mono text-[12px] uppercase tracking-wide text-muted hover:text-ink transition-colors hidden sm:inline"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="font-mono text-[12px] uppercase tracking-wide bg-ink text-paper px-4 py-2 rounded-sm font-bold transition-colors"
              >
                Start keeping
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

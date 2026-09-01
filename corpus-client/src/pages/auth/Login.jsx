import { useState, useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { BASE } from '../../api/axios.js'

export default function Login() {
  const { user, isLoading: authLoading, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('error') === 'google_failed') {
      setError('Google Sign In failed. Please try again.')
    }
  }, [location.search])

  function handleGoogleLogin() {
    window.location.href = `${BASE}/auth/google`
  }

  if (!authLoading && user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password, redirectTo)
    } catch (err) {
      const respData = err?.response?.data
      if (respData?.requiresPasswordSetup) {
        navigate('/set-password', { state: { email: respData.email || email } })
        return
      }
      const errData = respData?.error
      if (typeof errData === 'object' && errData !== null) {
        const first = Object.values(errData)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError(errData || 'Login failed. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#fff8f4] font-circular">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-[#f0e8e0] border-r border-[#d0c8c0] p-12 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(black 1px,transparent 1px),linear-gradient(90deg,black 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Back to Home */}
        <Link
          to="/"
          className="relative z-10 self-start flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-white text-[12px] font-bold text-black hover:shadow-[3px_3px_0px_black] shadow-[2px_2px_0px_black] transition-all"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Main copy */}
        <div className="relative z-10 max-w-md">
          <div className="mb-5">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-7 w-auto object-contain" /></Link>
          </div>
          <h1 className="font-roc text-[52px] leading-[1.05] font-black text-black mb-5">
            Your second<br />
            brain,<br />
            <span className="text-[#cc3d00]">organized.</span>
          </h1>
          <p className="font-circular text-[15px] text-[#666] leading-relaxed mb-8">
            Save links, notes, and ideas. Search them instantly. Let AI surface what matters.
          </p>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-3">
            {[
              'AI-powered search',
              'Smart tagging',
              'Spaces & collections',
              'Instant recall',
            ].map((f) => (
              <div
                key={f}
                className="px-4 py-2.5 border-2 border-black rounded-[4px] text-[12px] font-bold text-black font-circular tracking-wide bg-white shadow-[2px_2px_0px_black]"
              >
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom links */}
        <div className="relative z-10 flex gap-6 text-[11px] text-[#888] font-circular">
          <span>© 2025 Corpus</span>
          <a href="#" className="hover:text-black transition-colors">Privacy</a>
          <a href="#" className="hover:text-black transition-colors">Terms</a>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">

        {/* Mobile back button */}
        <Link
          to="/"
          className="lg:hidden absolute top-6 left-6 flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-white text-[12px] font-bold text-black shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] transition-all"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Home
        </Link>

        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center flex justify-center items-center">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-9 w-auto object-contain" /></Link>
          </div>

          {/* Tab switcher */}
          <div className="flex mb-7 border-2 border-black rounded-[4px] p-1 bg-white shadow-[3px_3px_0px_black]">
            <button
              className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider font-circular rounded-[2px] bg-black text-white transition-all"
            >
              Sign In
            </button>
            <Link
              to="/signup"
              className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider font-circular text-center text-[#999] hover:text-black transition-colors rounded-[2px]"
            >
              Create Account
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="font-roc text-[32px] font-black text-black leading-tight mb-1">Welcome back.</h2>
            <p className="font-circular text-[13px] text-[#888]">Pick up where you left off.</p>
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="relative overflow-hidden group w-full flex items-center justify-center gap-3 bg-white text-black font-circular text-[13px] font-bold py-3 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_black] hover:shadow-[4px_4px_0px_black] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer mb-4 select-none"
          >
            <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
            <div className="relative z-10 flex items-center justify-center gap-3 transition-colors duration-300 group-hover:text-white">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </div>
          </button>

          {/* Divider */}
          <div className="relative mb-4 flex items-center">
            <div className="flex-1 border-t border-[#ddd]" />
            <span className="px-3 font-circular text-[10px] uppercase tracking-widest text-[#aaa] font-bold">or</span>
            <div className="flex-1 border-t border-[#ddd]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1.5 font-bold">Email</label>
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                className="w-full border-2 border-black rounded-[4px] px-4 py-3 text-[14px] font-circular bg-white text-black focus:outline-none focus:border-black focus:shadow-[3px_3px_0px_black] transition-all placeholder:text-[#ccc]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1.5 font-bold">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                  className="w-full border-2 border-black rounded-[4px] pl-4 pr-11 py-3 text-[14px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all placeholder:text-[#ccc]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-black transition-colors p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {location.state?.message && !error && (
              <div className="p-3 border-2 border-green-400 bg-green-50 rounded-[4px]">
                <p className="text-[12px] text-green-700 font-circular font-medium">{location.state.message}</p>
              </div>
            )}
            {error && (
              <div className="p-3 border-2 border-red-300 bg-red-50 rounded-[4px]">
                <p className="text-[12px] text-red-600 font-circular font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative overflow-hidden group w-full bg-black text-white font-circular text-[13px] uppercase tracking-widest font-black py-3.5 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.25)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer mt-1 flex items-center justify-center gap-2 select-none"
            >
              <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
              <span className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:scale-105">
                {loading ? 'Signing in…' : <>Sign In <span className="text-[16px]">→</span></>}
              </span>
            </button>
          </form>

          <p className="font-circular text-[12px] text-[#888] text-center mt-5">
            No account?{' '}
            <Link to="/signup" className="text-black font-bold hover:underline">
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

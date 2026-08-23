import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      {/* Floating Back to Home button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-white text-[12px] font-bold font-circular shadow-[3px_3px_0px_black] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_black] transition-all text-black"
      >
        <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="16" className="mr-0.5">
          <path d="M19 12H5M12 19l-7-7 7-7"></path>
        </svg>
        Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-sm bg-white border-2 border-black rounded-[10px] p-8 shadow-[6px_6px_0px_black] select-none">
        <div className="mb-8 text-center">
          <Link to="/" className="font-roc text-[36px] font-bold text-black leading-none">corpus.</Link>
          <p className="font-circular text-[12px] text-gray-500 mt-2 uppercase tracking-widest font-bold">
            Sign In
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-circular text-[11px] uppercase tracking-wider text-gray-500 block mb-1.5 font-bold">
              Email
            </label>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-black rounded-[4px] px-4 py-3 text-[14px] font-circular bg-white focus:outline-none focus:ring-0 focus:border-[#0d5ddf] transition-all placeholder:text-gray-300 text-black"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="font-circular text-[11px] uppercase tracking-wider text-gray-500 block mb-1.5 font-bold">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-black rounded-[4px] px-4 py-3 text-[14px] font-circular bg-white focus:outline-none focus:ring-0 focus:border-[#0d5ddf] transition-all placeholder:text-gray-300 text-black"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[12.5px] text-red-600 font-circular">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-circular text-[13px] uppercase tracking-wider font-bold py-3.5 rounded-[4px] hover:bg-gray-900 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.15)] active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="font-circular text-[12px] text-gray-500 text-center mt-6">
          No account?{' '}
          <Link to="/signup" className="text-black font-bold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}

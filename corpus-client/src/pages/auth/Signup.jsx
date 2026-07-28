import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

export default function Signup() {
  const { signup } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await signup(name, email, password)
    } catch (err) {
      const errData = err?.response?.data?.error
      if (typeof errData === 'object') {
        const first = Object.values(errData)[0]
        setError(Array.isArray(first) ? first[0] : JSON.stringify(first))
      } else {
        setError(errData || 'Signup failed. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-8">
      {/* Background grid overlay */}
      <div className="fixed inset-0 pointer-events-none bg-grid-overlay z-0" data-purpose="background-pattern"></div>

      <div className="relative z-10 w-full max-w-sm bg-white border-2 border-black rounded-[10px] p-8 shadow-[6px_6px_0px_black] select-none">
        <div className="mb-8 text-center">
          <Link to="/" className="font-roc text-[36px] font-bold text-black leading-none">corpus.</Link>
          <p className="font-circular text-[12px] text-gray-500 mt-2 uppercase tracking-widest font-bold">
            Create Account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-circular text-[11px] uppercase tracking-wider text-gray-500 block mb-1.5 font-bold">
              Name
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-black rounded-[4px] px-4 py-3 text-[14px] font-circular bg-white focus:outline-none focus:ring-0 focus:border-[#0d5ddf] transition-all placeholder:text-gray-300 text-black"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="font-circular text-[11px] uppercase tracking-wider text-gray-500 block mb-1.5 font-bold">
              Email
            </label>
            <input
              type="email"
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
              placeholder="min. 6 characters"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="font-circular text-[12px] text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

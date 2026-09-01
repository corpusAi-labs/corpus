import { useState, useRef, useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { BASE } from '../../api/axios.js'

export default function Signup() {
  const { user, isLoading: authLoading, signup, verifyOtp, resendOtp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const otpInputRefs = useRef([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('error') === 'google_failed') {
      setError('Google Sign In failed. Please try again.')
    }
  }, [location.search])

  function handleGoogleLogin() {
    window.location.href = `${BASE}/auth/google`
  }

  useEffect(() => {
    let interval = null
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((p) => p - 1), 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [step, resendTimer])

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
  }, [step])

  if (!authLoading && user) return <Navigate to={redirectTo} replace />

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (!trimmedName) { setError('Please enter your name.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await signup(trimmedName, trimmedEmail, password, confirmPassword)
      setStep('otp')
      setResendTimer(60)
      setOtpDigits(['', '', '', '', '', ''])
      setSuccessMsg(`Verification code sent to ${trimmedEmail}`)
    } catch (err) {
      const respData = err?.response?.data
      if (respData?.requiresPasswordSetup) {
        navigate('/set-password', { state: { email: respData.email || trimmedEmail } })
        return
      }
      const errData = respData?.error
      if (typeof errData === 'object' && errData !== null) {
        const first = Object.values(errData)[0]
        setError(Array.isArray(first) ? first[0] : String(first))
      } else {
        setError(errData || 'Signup failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index, value) {
    const cleanVal = value.replace(/\D/g, '')
    if (!cleanVal) { const d = [...otpDigits]; d[index] = ''; setOtpDigits(d); return }
    const d = [...otpDigits]; d[index] = cleanVal.slice(-1); setOtpDigits(d)
    if (error) setError('')
    if (index < 5) otpInputRefs.current[index + 1]?.focus()
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '')
    if (!pasted) return
    const d = [...otpDigits]
    for (let i = 0; i < 6; i++) d[i] = pasted[i] || ''
    setOtpDigits(d)
    if (error) setError('')
    otpInputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpInputRefs.current[index - 1]?.focus()
    else if (e.key === 'ArrowLeft' && index > 0) otpInputRefs.current[index - 1]?.focus()
    else if (e.key === 'ArrowRight' && index < 5) otpInputRefs.current[index + 1]?.focus()
  }

  async function handleVerifySubmit(e) {
    e.preventDefault()
    setError(''); setSuccessMsg('')
    const fullOtp = otpDigits.join('')
    if (fullOtp.length !== 6) { setError('Please enter the full 6-digit code.'); return }
    setLoading(true)
    try {
      await verifyOtp(email.trim(), fullOtp, redirectTo)
    } catch (err) {
      const errData = err?.response?.data?.error
      setError(errData || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || loading) return
    setError(''); setSuccessMsg(''); setLoading(true)
    try {
      await resendOtp(email.trim())
      setResendTimer(60)
      setOtpDigits(['', '', '', '', '', ''])
      setSuccessMsg('A new verification code has been sent.')
      otpInputRefs.current[0]?.focus()
    } catch (err) {
      const errData = err?.response?.data?.error
      setError(errData || 'Failed to resend verification code.')
    } finally {
      setLoading(false)
    }
  }

  // Shared eye icon toggle button
  function EyeBtn({ show, toggle }) {
    return (
      <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-black transition-colors p-1">
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        )}
      </button>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex bg-[#fff8f4] font-circular">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-[#f0e8e0] border-r border-[#d0c8c0] p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(black 1px,transparent 1px),linear-gradient(90deg,black 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <Link
          to="/"
          className="relative z-10 self-start flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-white text-[12px] font-bold text-black shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] transition-all"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="mb-4">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-7 w-auto object-contain" /></Link>
          </div>
          <h1 className="font-roc text-[42px] leading-[1.05] font-black text-black mb-4">
            Start building<br />
            your second<br />
            <span className="text-[#cc3d00]">brain.</span>
          </h1>
          <p className="font-circular text-[14px] text-[#666] leading-relaxed mb-6">
            Free forever. No credit card required. Join thousands of people using Corpus to save, organize, and recall anything.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {['AI-powered search', 'Smart tagging', 'Spaces & collections', 'Instant recall'].map((f) => (
              <div key={f} className="px-3 py-2 border-2 border-black rounded-[4px] text-[11px] font-bold text-black font-circular tracking-wide bg-white shadow-[2px_2px_0px_black]">
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex gap-6 text-[11px] text-[#999] font-circular">
          <span>© 2025 Corpus</span>
          <a href="#" className="hover:text-black transition-colors">Privacy</a>
          <a href="#" className="hover:text-black transition-colors">Terms</a>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 relative overflow-y-auto">

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
          <div className="lg:hidden mb-6 text-center flex justify-center items-center">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-9 w-auto object-contain" /></Link>
          </div>

          {step === 'details' && (
            <>
              {/* Tab switcher */}
              <div className="flex mb-5 border-2 border-black rounded-[4px] p-1 bg-white shadow-[3px_3px_0px_black]">
                <Link
                  to="/login"
                  className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider font-circular text-center text-[#999] hover:text-black transition-colors rounded-[2px]"
                >
                  Sign In
                </Link>
                <button
                  className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider font-circular rounded-[2px] bg-black text-white transition-all"
                >
                  Create Account
                </button>
              </div>

              <div className="mb-4">
                <h2 className="font-roc text-[26px] font-black text-black leading-tight mb-0.5">Start building.</h2>
                <p className="font-circular text-[12px] text-[#888]">Create your workspace for free.</p>
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="relative overflow-hidden group w-full flex items-center justify-center gap-3 bg-white text-black font-circular text-[13px] font-bold py-2.5 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_black] hover:shadow-[4px_4px_0px_black] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer mb-3 select-none"
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

              <div className="relative mb-3 flex items-center">
                <div className="flex-1 border-t border-[#ddd]" />
                <span className="px-3 font-circular text-[10px] uppercase tracking-widest text-[#aaa] font-bold">or</span>
                <div className="flex-1 border-t border-[#ddd]" />
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-3">
                <div>
                  <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1 font-bold">Full Name</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (error) setError('') }}
                    className="w-full border-2 border-black rounded-[4px] px-4 py-2 text-[13px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all placeholder:text-[#ccc]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1 font-bold">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    className="w-full border-2 border-black rounded-[4px] px-4 py-2 text-[13px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all placeholder:text-[#ccc]"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1 font-bold">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                      className="w-full border-2 border-black rounded-[4px] pl-4 pr-11 py-2 text-[13px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all placeholder:text-[#ccc]"
                      placeholder="min. 6 characters"
                    />
                    <EyeBtn show={showPassword} toggle={() => setShowPassword(!showPassword)} />
                  </div>
                </div>
                <div>
                  <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1 font-bold">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                      className="w-full border-2 border-black rounded-[4px] pl-4 pr-11 py-2 text-[13px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all placeholder:text-[#ccc]"
                      placeholder="re-enter password"
                    />
                    <EyeBtn show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                  </div>
                </div>

                {error && (
                  <div className="p-3 border-2 border-red-300 bg-red-50 rounded-[4px]">
                    <p className="text-[12px] text-red-600 font-circular font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="relative overflow-hidden group w-full bg-black text-white font-circular text-[13px] uppercase tracking-widest font-black py-2.5 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.25)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                  <span className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:scale-105">
                    {loading ? 'Sending code…' : <>Continue <span className="text-[16px]">→</span></>}
                  </span>
                </button>
              </form>

              <p className="font-circular text-[12px] text-[#888] text-center mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-black font-bold hover:underline">
                  Sign in →
                </Link>
              </p>
            </>
          )}

          {step === 'otp' && (
            <>
              {/* Logo Header */}
              <div className="mb-6 flex justify-center">
                <img src="/Frame 4.svg" alt="Corpus Logo" className="h-9 w-auto object-contain" />
              </div>

              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-black rounded-full bg-[#fff3ec] text-[#cc3d00] font-bold text-[11px] uppercase tracking-wider mb-3 shadow-[2px_2px_0px_black]">
                  ✉️ Verification Required
                </div>
                <h2 className="font-roc text-[28px] font-black text-black leading-tight mb-1.5">Check your email.</h2>
                <p className="font-circular text-[13px] text-[#666]">
                  We sent a 6-digit code to{' '}
                  <span className="text-black font-bold underline decoration-[#ff6b2b] decoration-2">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="flex justify-between gap-2 p-3 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_black]">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-[22px] font-mono font-black border-2 border-black rounded-[6px] bg-[#fff8f4] text-black focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_black] focus:border-[#ff6b2b] transition-all"
                    />
                  ))}
                </div>

                {successMsg && (
                  <div className="p-3 border-2 border-green-400 bg-green-50 rounded-[6px]">
                    <p className="text-[12px] text-green-700 font-circular font-medium text-center">{successMsg}</p>
                  </div>
                )}
                {error && (
                  <div className="p-3 border-2 border-red-400 bg-red-50 rounded-[6px]">
                    <p className="text-[12px] text-red-600 font-circular font-medium text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="relative overflow-hidden group w-full bg-black text-white font-circular text-[13px] uppercase tracking-widest font-black py-3.5 rounded-[6px] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.25)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                  <span className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:scale-105">
                    {loading ? 'Verifying…' : <>Verify &amp; Create Account <span className="text-[16px]">→</span></>}
                  </span>
                </button>

                <div className="flex flex-col items-center gap-3 pt-1 text-center">
                  {resendTimer > 0 ? (
                    <p className="font-circular text-[12px] text-[#888]">
                      Resend code in <span className="font-bold text-black font-mono">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="font-circular text-[12.5px] text-black font-bold hover:underline cursor-pointer"
                    >
                      Resend verification code
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setStep('details'); setError(''); setSuccessMsg('') }}
                    className="font-circular text-[12px] text-[#888] hover:text-black font-bold transition-colors"
                  >
                    ← Edit details / Change email
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

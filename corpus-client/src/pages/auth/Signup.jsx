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
    <div className="min-h-screen flex bg-[#fdfbf7] font-graphik text-black relative">

      {/* ── LEFT PANEL ── */}
      <div 
        className="hidden lg:flex flex-col justify-between w-[50%] bg-[#eadfc9] border-r border-[#424242]/25 p-12 relative overflow-hidden"
        style={{
          backgroundImage: 'url(/images/pricing.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
        }}
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-grid-cardboard opacity-30 pointer-events-none" />

        {/* Back to Home Button with PaperButton style */}
        <Link
          to="/"
          className="button-paper group h-10 inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[3px_3px_0_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.12)] transition-all select-none self-start relative z-10"
        >
          <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#ea5834]" />
          <div className="h-full w-8 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px] bg-[#ea5834] text-white transition-colors duration-300 group-hover:bg-[#1d52d8]">
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="font-graphik text-[12px] font-bold px-3 leading-none flex-1 h-full relative z-1 overflow-hidden">
            <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
              <div className="h-full shrink-0 flex items-center justify-center text-[#212121]">
                Back to Home
              </div>
              <div className="h-full shrink-0 flex items-center justify-center text-white">
                Back to Home
              </div>
            </div>
          </div>
        </Link>

        {/* Main copy */}
        <div className="relative z-10 max-w-md my-auto py-8">
          <div className="mb-6">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-8 w-auto object-contain" /></Link>
          </div>
          <h1 className="font-hanken text-[48px] sm:text-[54px] leading-[0.94] font-900 uppercase tracking-tight text-black mb-5">
            Start building <br />
            your second <br />
            <span className="text-[#ea5834]">brain.</span>
          </h1>
          <p className="font-graphik text-[15px] text-[#4a4a4a] leading-relaxed mb-8 font-medium">
            Free forever. No credit card required. Join thousands of creators using Corpus to organize ideas.
          </p>

          {/* Feature pills styled as mini pricing cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'AI-powered search', color: '#1d52d8' },
              { label: 'Smart tagging', color: '#ea5834' },
              { label: 'Spaces & collections', color: '#258b30' },
              { label: 'Instant recall', color: '#faa200' },
            ].map((f) => (
              <div
                key={f.label}
                className="px-3.5 py-2.5 border border-[#424242]/20 rounded-[4px] text-[12px] font-bold text-[#212121] font-graphik bg-[#FDF8F0] shadow-[3px_3px_0_rgba(0,0,0,0.06)] flex items-center gap-2.5 transition-transform hover:-translate-y-0.5"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom links */}
        <div className="relative z-10 flex gap-6 text-[12px] text-[#6b6b6b] font-graphik font-medium">
          <span>© 2025 Corpus</span>
          <a href="#" className="hover:text-black transition-colors">Privacy</a>
          <a href="#" className="hover:text-black transition-colors">Terms</a>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div 
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative bg-[#fdfbf7] overflow-y-auto"
        style={{
          backgroundImage: 'url(/images/pricing-1.jpg)',
          backgroundRepeat: 'repeat',
          backgroundSize: 'cover',
        }}
      >
        {/* Mobile back button */}
        <Link
          to="/"
          className="lg:hidden absolute top-6 left-6 button-paper group h-9 inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[3px_3px_0_rgba(0,0,0,0.08)] select-none"
        >
          <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#ea5834]" />
          <div className="h-full w-7 shrink-0 flex items-center justify-center rounded-[2px] bg-[#ea5834] text-white z-1 relative transition-colors duration-300 group-hover:bg-[#1d52d8]">
            <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="12">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="font-graphik text-[11px] font-bold px-2.5 leading-none flex-1 h-full relative z-1 overflow-hidden">
            <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
              <div className="h-full shrink-0 flex items-center justify-center text-[#212121]">
                Home
              </div>
              <div className="h-full shrink-0 flex items-center justify-center text-white">
                Home
              </div>
            </div>
          </div>
        </Link>

        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-6 text-center flex justify-center items-center">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-9 w-auto object-contain" /></Link>
          </div>

          {step === 'details' && (
            <>
              {/* Tab switcher */}
              <div className="flex mb-6 border border-[#424242]/25 rounded-[4px] p-1 bg-[#eadfc9] shadow-[3px_3px_0_rgba(0,0,0,0.06)]">
                <Link
                  to="/login"
                  className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider font-hanken text-center text-[#555] hover:text-black transition-colors rounded-[2px]"
                >
                  Sign In
                </Link>
                <button
                  className="flex-1 py-2 text-[12px] font-bold uppercase tracking-wider font-hanken rounded-[2px] bg-[#ea5834] text-white shadow-xs transition-all"
                >
                  Create Account
                </button>
              </div>

              {/* Heading */}
              <div className="mb-5">
                <h2 className="font-hanken text-[32px] font-900 text-black uppercase tracking-tight leading-tight mb-1">
                  Start building.
                </h2>
                <p className="font-graphik text-[14px] text-[#6b6b6b] font-medium">Create your workspace for free.</p>
              </div>

              {/* Google button with PaperButton style */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="button-paper group h-11 w-full inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[3px_3px_0_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.12)] transition-all select-none mb-4"
              >
                {/* Rolling background cover on hover */}
                <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#ea5834]" />

                {/* Left Google Icon Square */}
                <div className="h-full w-9 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px] bg-white border border-[#A19D94]/30 shadow-xs">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>

                {/* Rolling text */}
                <div className="font-graphik text-[13px] font-bold leading-none flex-1 h-full relative z-1 overflow-hidden">
                  <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
                    <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-[#212121]">
                      Continue with Google
                    </div>
                    <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-white">
                      Continue with Google
                    </div>
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div className="relative mb-4 flex items-center">
                <div className="flex-1 border-t border-[#424242]/20" />
                <span className="px-3 font-mono text-[10px] uppercase tracking-widest text-[#7a7a7a] font-bold">or</span>
                <div className="flex-1 border-t border-[#424242]/20" />
              </div>

              {/* Form */}
              <form onSubmit={handleDetailsSubmit} className="space-y-3">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1 font-bold">Full Name</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (error) setError('') }}
                    className="w-full border border-[#424242]/25 rounded-[4px] px-3.5 py-2.5 text-[13px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1 font-bold">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                    className="w-full border border-[#424242]/25 rounded-[4px] px-3.5 py-2.5 text-[13px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1 font-bold">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                      className="w-full border border-[#424242]/25 rounded-[4px] pl-3.5 pr-10 py-2.5 text-[13px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                      placeholder="min. 6 characters"
                    />
                    <EyeBtn show={showPassword} toggle={() => setShowPassword(!showPassword)} />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1 font-bold">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                      className="w-full border border-[#424242]/25 rounded-[4px] pl-3.5 pr-10 py-2.5 text-[13px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                      placeholder="re-enter password"
                    />
                    <EyeBtn show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                  </div>
                </div>

                {error && (
                  <div className="p-3 border border-[#ea5834]/40 bg-[#ea5834]/10 rounded-[4px]">
                    <p className="text-[12px] text-[#ea5834] font-graphik font-medium">{error}</p>
                  </div>
                )}

                {/* PaperButton Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="button-paper group h-11 w-full inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 select-none mt-2"
                >
                  <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#ea5834]" />

                  {/* Left Arrow Square Box */}
                  <div className="h-full w-9 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px]">
                    <svg viewBox="0 0 37 37" fill="none" className="size-7 sm:size-8">
                      <rect width="37" height="37" rx="2" fill="#ea5834" className="transition-opacity duration-300 ease-out group-hover:opacity-0" />
                      <rect width="37" height="37" rx="2" fill="#1d52d8" className="opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
                      <g className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
                        <circle cx="4" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-0 group-hover:opacity-20" />
                        <circle cx="8" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-20 group-hover:opacity-40" />
                        <circle cx="12" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-40 group-hover:opacity-60" />
                        <circle cx="16" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-60 group-hover:opacity-80" />
                        <circle cx="20" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
                      </g>
                      <path d="M21 25L27 19L21 13" stroke="#EADFC9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 ease-out group-hover:translate-x-4 group-hover:opacity-0" />
                    </svg>
                    <svg viewBox="0 0 37 37" fill="none" className="size-7 sm:size-8 inset-0 absolute pointer-events-none transition-transform duration-300 ease-out scale-0 origin-center group-hover:scale-100 group-hover:delay-75 delay-0">
                      <path d="M21 25L27 19L21 13" stroke="#EADFC9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="font-hanken text-[13px] uppercase tracking-wider font-bold leading-none flex-1 h-full relative z-1 overflow-hidden">
                    <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
                      <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-[#212121]">
                        {loading ? 'Sending code…' : 'Continue'}
                      </div>
                      <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-white">
                        {loading ? 'Sending code…' : 'Continue'}
                      </div>
                    </div>
                  </div>
                </button>
              </form>

              <p className="font-graphik text-[13px] text-[#6b6b6b] text-center mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-[#ea5834] font-bold hover:underline">
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#ea5834]/30 rounded-full bg-[#ea5834]/10 text-[#ea5834] font-bold text-[11px] uppercase tracking-wider mb-3">
                  ✉️ Verification Required
                </div>
                <h2 className="font-hanken text-[28px] font-900 uppercase tracking-tight text-black leading-tight mb-1.5">Check your email.</h2>
                <p className="font-graphik text-[13px] text-[#6b6b6b]">
                  We sent a 6-digit code to{' '}
                  <span className="text-black font-bold underline decoration-[#ea5834] decoration-2">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="flex justify-between gap-2 p-3 bg-[#FDF8F0] border border-[#424242]/25 rounded-[4px] shadow-[3px_3px_0_rgba(0,0,0,0.06)]">
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
                      className="w-10 h-12 text-center text-[20px] font-mono font-black border border-[#424242]/30 rounded-[4px] bg-white text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[2px_2px_0_rgba(234,88,52,0.2)] transition-all"
                    />
                  ))}
                </div>

                {successMsg && (
                  <div className="p-3 border border-green-500/30 bg-[#258b30]/10 rounded-[4px]">
                    <p className="text-[12px] text-[#258b30] font-graphik font-medium text-center">{successMsg}</p>
                  </div>
                )}
                {error && (
                  <div className="p-3 border border-[#ea5834]/40 bg-[#ea5834]/10 rounded-[4px]">
                    <p className="text-[12px] text-[#ea5834] font-graphik font-medium text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="button-paper group h-12 w-full inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 select-none"
                >
                  <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#ea5834]" />

                  {/* Left Arrow Square Box */}
                  <div className="h-full w-9 sm:w-10 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px]">
                    <svg viewBox="0 0 37 37" fill="none" className="size-7 sm:size-8">
                      <rect width="37" height="37" rx="2" fill="#ea5834" className="transition-opacity duration-300 ease-out group-hover:opacity-0" />
                      <rect width="37" height="37" rx="2" fill="#1d52d8" className="opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
                      <g className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
                        <circle cx="4" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-0 group-hover:opacity-20" />
                        <circle cx="8" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-20 group-hover:opacity-40" />
                        <circle cx="12" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-40 group-hover:opacity-60" />
                        <circle cx="16" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-60 group-hover:opacity-80" />
                        <circle cx="20" cy="19" r="1" fill="#D9D9D9" className="transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
                      </g>
                      <path d="M21 25L27 19L21 13" stroke="#EADFC9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-300 ease-out group-hover:translate-x-4 group-hover:opacity-0" />
                    </svg>
                    <svg viewBox="0 0 37 37" fill="none" className="size-7 sm:size-8 inset-0 absolute pointer-events-none transition-transform duration-300 ease-out scale-0 origin-center group-hover:scale-100 group-hover:delay-75 delay-0">
                      <path d="M21 25L27 19L21 13" stroke="#EADFC9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="font-hanken text-[13px] uppercase tracking-wider font-bold leading-none flex-1 h-full relative z-1 overflow-hidden">
                    <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
                      <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-[#212121]">
                        {loading ? 'Verifying…' : 'Verify & Create Account'}
                      </div>
                      <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-white">
                        {loading ? 'Verifying…' : 'Verify & Create Account'}
                      </div>
                    </div>
                  </div>
                </button>

                <div className="flex flex-col items-center gap-3 pt-1 text-center">
                  {resendTimer > 0 ? (
                    <p className="font-graphik text-[12px] text-[#888]">
                      Resend code in <span className="font-bold text-black font-mono">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="font-graphik text-[12.5px] text-[#ea5834] font-bold hover:underline cursor-pointer"
                    >
                      Resend verification code
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setStep('details'); setError(''); setSuccessMsg('') }}
                    className="font-graphik text-[12px] text-[#888] hover:text-black font-bold transition-colors"
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

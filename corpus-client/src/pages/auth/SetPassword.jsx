import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import API, { BASE } from '../../api/axios.js'

export default function SetPassword() {
  const location = useLocation()
  const navigate = useNavigate()

  // Retrieve email and session state from location or sessionStorage
  const navEmail = location.state?.email
  const storedEmail = sessionStorage.getItem('set_password_email') || ''
  const activeEmail = navEmail || storedEmail

  const storedOtpSent = sessionStorage.getItem('set_password_otp_sent') === 'true'
  const storedTimerEnd = Number(sessionStorage.getItem('set_password_timer_end')) || 0

  const [email, setEmail] = useState(activeEmail)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(storedOtpSent)
  const [resendTimer, setResendTimer] = useState(() => {
    if (storedTimerEnd > Date.now()) {
      return Math.max(0, Math.floor((storedTimerEnd - Date.now()) / 1000))
    }
    return 0
  })

  const otpInputRefs = useRef([])

  useEffect(() => {
    if (activeEmail) {
      sessionStorage.setItem('set_password_email', activeEmail)
    }
  }, [activeEmail])

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  function handleGoogleLogin() {
    clearSessionState()
    window.location.href = `${BASE}/auth/google`
  }

  async function handleRequestOtp(targetEmail) {
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setSendingOtp(true)
    try {
      await API.post('/auth/request-password-setup', { email: targetEmail })
      setOtpSent(true)
      const timerEnd = Date.now() + 60000
      setResendTimer(60)
      sessionStorage.setItem('set_password_email', targetEmail)
      sessionStorage.setItem('set_password_otp_sent', 'true')
      sessionStorage.setItem('set_password_timer_end', String(timerEnd))
      setSuccessMsg('Verification code sent to ' + targetEmail)
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Failed to send verification code.'
      setError(errMsg)
    } finally {
      setSendingOtp(false)
    }
  }

  function handleOtpChange(idx, val) {
    const clean = val.replace(/\D/g, '')
    const updated = [...otpDigits]
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('')
      for (let i = 0; i < 6; i++) updated[i] = chars[i] || ''
      setOtpDigits(updated)
      const nextFocus = Math.min(chars.length, 5)
      otpInputRefs.current[nextFocus]?.focus()
    } else {
      updated[idx] = clean.slice(-1)
      setOtpDigits(updated)
      if (clean && idx < 5) otpInputRefs.current[idx + 1]?.focus()
    }
    if (error) setError('')
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '')
    if (!pasted) return
    const updated = ['', '', '', '', '', '']
    for (let i = 0; i < Math.min(pasted.length, 6); i++) {
      updated[i] = pasted[i]
    }
    setOtpDigits(updated)
    if (error) setError('')
    const focusIndex = Math.min(pasted.length, 5)
    otpInputRefs.current[focusIndex]?.focus()
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus()
    }
  }

  function clearSessionState() {
    sessionStorage.removeItem('set_password_email')
    sessionStorage.removeItem('set_password_otp_sent')
    sessionStorage.removeItem('set_password_timer_end')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const otp = otpDigits.join('')
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit verification code.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await API.post('/auth/confirm-password-setup', {
        email: email.trim(),
        otp,
        password,
        confirmPassword,
      })
      clearSessionState()
      setSuccessMsg('Password created successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password set successfully! Please sign in with your new password.' },
        })
      }, 1500)
    } catch (err) {
      const errMsg = err?.response?.data?.error || 'Failed to set password. Try again.'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
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
        <div className="absolute inset-0 bg-grid-cardboard opacity-30 pointer-events-none" />

        {/* Back to Login with PaperButton style */}
        <Link
          to="/login"
          onClick={clearSessionState}
          className="button-paper group h-10 inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[3px_3px_0_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.12)] transition-all select-none self-start relative z-10"
        >
          <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#1d52d8]" />
          <div className="h-full w-8 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px] bg-[#1d52d8] text-white transition-colors duration-300 group-hover:bg-[#ea5834]">
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="font-graphik text-[12px] font-bold px-3 leading-none flex-1 h-full relative z-1 overflow-hidden">
            <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
              <div className="h-full shrink-0 flex items-center justify-center text-[#212121]">
                Back to Login
              </div>
              <div className="h-full shrink-0 flex items-center justify-center text-white">
                Back to Login
              </div>
            </div>
          </div>
        </Link>

        <div className="relative z-10 max-w-md my-auto py-8">
          <div className="mb-6">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-8 w-auto object-contain" /></Link>
          </div>
          <h1 className="font-hanken text-[48px] sm:text-[54px] leading-[0.94] font-900 uppercase tracking-tight text-black mb-5">
            Set password for<br />
            <span className="text-[#ea5834]">your account.</span>
          </h1>
          <p className="font-graphik text-[15px] text-[#4a4a4a] leading-relaxed mb-8 font-medium">
            Your account was registered via Google. Create a password so you can sign in directly using email &amp; password anytime.
          </p>

          <div className="p-4 border border-[#424242]/20 bg-[#FDF8F0] rounded-[4px] shadow-[3px_3px_0_rgba(0,0,0,0.06)]">
            <p className="text-[13px] font-bold text-black font-graphik flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1d52d8]" />
              Secure Account Access
            </p>
            <p className="text-[12px] text-[#6b6b6b] font-graphik mt-1.5 leading-relaxed">
              Verify email ownership with a 6-digit code before creating your secure permanent password.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex gap-6 text-[12px] text-[#6b6b6b] font-graphik font-medium">
          <span>© 2026 Corpus</span>
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
        <Link
          to="/login"
          onClick={clearSessionState}
          className="lg:hidden absolute top-6 left-6 button-paper group h-9 inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[3px_3px_0_rgba(0,0,0,0.08)] select-none"
        >
          <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#1d52d8]" />
          <div className="h-full w-7 shrink-0 flex items-center justify-center rounded-[2px] bg-[#1d52d8] text-white z-1 relative transition-colors duration-300 group-hover:bg-[#ea5834]">
            <svg fill="none" height="12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="12">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="font-graphik text-[11px] font-bold px-2.5 leading-none flex-1 h-full relative z-1 overflow-hidden">
            <div className="h-full flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-full">
              <div className="h-full shrink-0 flex items-center justify-center text-[#212121]">
                Login
              </div>
              <div className="h-full shrink-0 flex items-center justify-center text-white">
                Login
              </div>
            </div>
          </div>
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-8 text-center flex justify-center items-center">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-9 w-auto object-contain" /></Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 border border-[#ea5834]/30 rounded-full bg-[#ea5834]/10 text-[#ea5834] font-bold text-[11px] uppercase tracking-wider mb-3">
              🔑 Password Setup Required
            </div>
            <h2 className="font-hanken text-[32px] font-900 text-black uppercase tracking-tight leading-tight mb-1.5">Create Password.</h2>
            <p className="font-graphik text-[14px] text-[#6b6b6b]">
              Set a password for <span className="font-bold text-black">{email || 'your account'}</span>
            </p>
          </div>

          {!otpSent && (
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1.5 font-bold">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder="you@example.com"
                  className="w-full border border-[#424242]/25 rounded-[4px] px-4 py-3 text-[14px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                />
              </div>

              {error && (
                <div className="p-3 border border-[#ea5834]/40 bg-[#ea5834]/10 rounded-[4px]">
                  <p className="text-[12px] text-[#ea5834] font-graphik font-medium">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleRequestOtp(email)}
                disabled={sendingOtp || !email.includes('@')}
                className="button-paper group h-12 w-full inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 select-none mt-2"
              >
                <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#1d52d8]" />

                <div className="h-full w-9 sm:w-10 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px]">
                  <svg viewBox="0 0 37 37" fill="none" className="size-7 sm:size-8">
                    <rect width="37" height="37" rx="2" fill="#1d52d8" className="transition-opacity duration-300 ease-out group-hover:opacity-0" />
                    <rect width="37" height="37" rx="2" fill="#ea5834" className="opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
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
                      {sendingOtp ? 'Sending Verification Code…' : 'Send Verification Code'}
                    </div>
                    <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-white">
                      {sendingOtp ? 'Sending Verification Code…' : 'Send Verification Code'}
                    </div>
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div className="relative my-4 flex items-center">
                <div className="flex-1 border-t border-[#424242]/20" />
                <span className="px-3 font-mono text-[10px] uppercase tracking-widest text-[#7a7a7a] font-bold">or</span>
                <div className="flex-1 border-t border-[#424242]/20" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="button-paper group h-12 w-full inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[3px_3px_0_rgba(0,0,0,0.08)] hover:shadow-[4px_4px_0_rgba(0,0,0,0.12)] transition-all select-none"
              >
                <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#1d52d8]" />
                <div className="h-full w-10 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px] bg-white border border-[#A19D94]/30 shadow-xs">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
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
            </div>
          )}

          {otpSent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1.5 font-bold">
                  Enter 6-Digit OTP Code
                </label>
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
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1.5 font-bold">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                    placeholder="••••••••"
                    className="w-full border border-[#424242]/25 rounded-[4px] pl-4 pr-11 py-3 text-[14px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-black transition-colors p-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-[#555] block mb-1.5 font-bold">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder="••••••••"
                  className="w-full border border-[#424242]/25 rounded-[4px] px-4 py-3 text-[14px] font-graphik bg-[#FDF8F0] text-black focus:outline-none focus:border-[#ea5834] focus:shadow-[3px_3px_0_rgba(234,88,52,0.15)] shadow-[2px_2px_0_rgba(0,0,0,0.05)] transition-all placeholder:text-[#999]"
                />
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
                disabled={loading || otpDigits.join('').length !== 6 || password.length < 6}
                className="button-paper group h-12 w-full inline-flex items-center overflow-hidden cursor-pointer bg-[#FDF8F0] text-[#212121] p-1 rounded-[4px] relative border border-[#A19D94] shadow-[4px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[5px_5px_0_rgba(0,0,0,0.15)] transition-all disabled:opacity-50 select-none"
              >
                <div className="absolute inset-[-1%] size-[102%] z-0 scale-y-0 origin-bottom rounded-[4px] transition-transform duration-300 ease-out group-hover:scale-y-100 bg-[#1d52d8]" />

                <div className="h-full w-9 sm:w-10 shrink-0 flex items-center justify-center z-1 relative overflow-hidden rounded-[2px]">
                  <svg viewBox="0 0 37 37" fill="none" className="size-7 sm:size-8">
                    <rect width="37" height="37" rx="2" fill="#1d52d8" className="transition-opacity duration-300 ease-out group-hover:opacity-0" />
                    <rect width="37" height="37" rx="2" fill="#ea5834" className="opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />
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
                      {loading ? 'Setting Password…' : 'Create Password & Continue'}
                    </div>
                    <div className="h-full shrink-0 flex items-center justify-center w-full px-2 text-center text-white">
                      {loading ? 'Setting Password…' : 'Create Password & Continue'}
                    </div>
                  </div>
                </div>
              </button>

              <div className="flex justify-between items-center pt-2 text-[12px] font-graphik">
                {resendTimer > 0 ? (
                  <span className="text-[#888]">Resend code in <strong className="text-black font-mono">{resendTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(email)}
                    className="font-bold text-[#ea5834] hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                )}
                <Link to="/login" onClick={clearSessionState} className="text-[#888] hover:text-black font-bold">
                  Cancel &amp; Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen flex bg-[#fff8f4] font-circular">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[48%] bg-[#f0e8e0] border-r border-[#d0c8c0] p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(black 1px,transparent 1px),linear-gradient(90deg,black 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <Link
          to="/login"
          onClick={clearSessionState}
          className="relative z-10 self-start flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-white text-[12px] font-bold text-black hover:shadow-[3px_3px_0px_black] shadow-[2px_2px_0px_black] transition-all"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Login
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="mb-5">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-7 w-auto object-contain" /></Link>
          </div>
          <h1 className="font-roc text-[46px] leading-[1.05] font-black text-black mb-5">
            Set password for<br />
            <span className="text-[#cc3d00]">your account.</span>
          </h1>
          <p className="font-circular text-[14px] text-[#666] leading-relaxed mb-6">
            Your account was registered via Google. Create a password so you can sign in directly using email &amp; password anytime.
          </p>

          <div className="p-4 border-2 border-black bg-white rounded-[4px] shadow-[3px_3px_0px_black]">
            <p className="text-[12px] font-bold text-black font-circular">🔒 Secure Account Access</p>
            <p className="text-[11px] text-[#777] font-circular mt-1">
              Click to receive a 6-digit OTP code to verify your email ownership before creating your password.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex gap-6 text-[11px] text-[#888] font-circular">
          <span>© 2026 Corpus</span>
          <a href="#" className="hover:text-black transition-colors">Privacy</a>
          <a href="#" className="hover:text-black transition-colors">Terms</a>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <Link
          to="/login"
          onClick={clearSessionState}
          className="lg:hidden absolute top-6 left-6 flex items-center gap-2 px-4 py-2 border-2 border-black rounded-[4px] bg-white text-[12px] font-bold text-black shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] transition-all"
        >
          <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Login
        </Link>

        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-8 text-center flex justify-center items-center">
            <Link to="/"><img src="/Frame 4.svg" alt="Corpus" className="h-9 w-auto object-contain" /></Link>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-black rounded-full bg-[#fff3ec] text-[#cc3d00] font-bold text-[11px] uppercase tracking-wider mb-3 shadow-[2px_2px_0px_black]">
              🔑 Password Setup Required
            </div>
            <h2 className="font-roc text-[30px] font-black text-black leading-tight mb-1.5">Create Password.</h2>
            <p className="font-circular text-[13px] text-[#666]">
              Set a password for <span className="font-bold text-black">{email || 'your account'}</span>
            </p>
          </div>

          {!otpSent && (
            <div className="space-y-4">
              <div>
                <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1.5 font-bold">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError('') }}
                  placeholder="you@example.com"
                  className="w-full border-2 border-black rounded-[4px] px-4 py-3 text-[14px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all"
                />
              </div>

              {error && (
                <div className="p-3 border-2 border-red-400 bg-red-50 rounded-[4px]">
                  <p className="text-[12px] text-red-600 font-circular font-medium">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleRequestOtp(email)}
                disabled={sendingOtp || !email.includes('@')}
                className="relative overflow-hidden group w-full bg-black text-white font-circular text-[13px] uppercase tracking-widest font-black py-3.5 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.25)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 select-none"
              >
                <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                <span className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:scale-105">
                  {sendingOtp ? 'Sending Verification Code…' : <>Send Verification Code <span className="text-[16px]">→</span></>}
                </span>
              </button>

              {/* Divider */}
              <div className="relative my-4 flex items-center">
                <div className="flex-1 border-t border-[#ddd]" />
                <span className="px-3 font-circular text-[10px] uppercase tracking-widest text-[#aaa] font-bold">or</span>
                <div className="flex-1 border-t border-[#ddd]" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="relative overflow-hidden group w-full flex items-center justify-center gap-3 bg-white text-black font-circular text-[13px] font-bold py-3 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_black] hover:shadow-[4px_4px_0px_black] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer select-none"
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
            </div>
          )}

          {otpSent && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1.5 font-bold">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex justify-between gap-2 p-2.5 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_black]">
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
                      className="w-11 h-12 text-center text-[22px] font-mono font-black border-2 border-black rounded-[6px] bg-[#fff8f4] text-black focus:outline-none focus:bg-[#ffffff] focus:shadow-[2px_2px_0px_black] focus:border-[#ff6b2b] transition-all"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1.5 font-bold">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                    placeholder="••••••••"
                    className="w-full border-2 border-black rounded-[4px] pl-4 pr-11 py-3 text-[14px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-black transition-colors p-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-circular text-[10px] uppercase tracking-widest text-[#888] block mb-1.5 font-bold">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder="••••••••"
                  className="w-full border-2 border-black rounded-[4px] px-4 py-3 text-[14px] font-circular bg-white text-black focus:outline-none focus:shadow-[3px_3px_0px_black] transition-all"
                />
              </div>

              {successMsg && (
                <div className="p-3 border-2 border-green-400 bg-green-50 rounded-[4px]">
                  <p className="text-[12px] text-green-700 font-circular font-medium text-center">{successMsg}</p>
                </div>
              )}

              {error && (
                <div className="p-3 border-2 border-red-400 bg-red-50 rounded-[4px]">
                  <p className="text-[12px] text-red-600 font-circular font-medium text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpDigits.join('').length !== 6 || password.length < 6}
                className="relative overflow-hidden group w-full bg-black text-white font-circular text-[13px] uppercase tracking-widest font-black py-3.5 rounded-[4px] border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.2)] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.25)] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 select-none"
              >
                <div className="absolute inset-0 bg-[#f74700] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                <span className="relative z-10 flex items-center justify-center gap-2 transition-transform duration-300 group-hover:scale-105">
                  {loading ? 'Setting Password…' : 'Create Password & Continue →'}
                </span>
              </button>

              {/* Or Continue with Google */}
              <div className="relative my-3 flex items-center">
                <div className="flex-1 border-t border-[#ddd]" />
                <span className="px-3 font-circular text-[10px] uppercase tracking-widest text-[#aaa] font-bold">or</span>
                <div className="flex-1 border-t border-[#ddd]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="relative overflow-hidden group w-full flex items-center justify-center gap-3 bg-white text-black font-circular text-[12px] font-bold py-2.5 rounded-[4px] border-2 border-black shadow-[2px_2px_0px_black] hover:shadow-[3px_3px_0px_black] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all cursor-pointer select-none"
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

              <div className="flex justify-between items-center pt-1 text-[12px] font-circular">
                {resendTimer > 0 ? (
                  <span className="text-[#888]">Resend code in <strong className="text-black font-mono">{resendTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestOtp(email)}
                    className="font-bold text-black hover:underline cursor-pointer"
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

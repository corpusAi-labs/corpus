import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'
import { loginApi, signupApi, verifyOtpApi, resendOtpApi, logoutApi } from '../api/auth.js'
import { saveSession, clearSession } from '../utils/authStorage.js'

export function useAuth() {
  const { user, token, isLoading, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(async (email, password, redirectTo = '/dashboard') => {
    const data = await loginApi(email, password)
    saveSession(data.user)
    setAuth(data.user, data.token)
    navigate(redirectTo, { replace: true })
  }, [setAuth, navigate])

  const signup = useCallback(async (name, email, password, confirmPassword) => {
    const data = await signupApi(name, email, password, confirmPassword)
    return data
  }, [])

  const verifyOtp = useCallback(async (email, otp, redirectTo = '/dashboard') => {
    const data = await verifyOtpApi(email, otp)
    saveSession(data.user)
    setAuth(data.user, data.token)
    navigate(redirectTo, { replace: true })
    return data
  }, [setAuth, navigate])

  const resendOtp = useCallback(async (email) => {
    const data = await resendOtpApi(email)
    return data
  }, [])

  const logout = useCallback(async () => {
    try { await logoutApi() } catch {}
    clearSession()
    clearAuth()
    navigate('/login')
  }, [clearAuth, navigate])

  return { user, token, isLoading, login, signup, verifyOtp, resendOtp, logout }
}


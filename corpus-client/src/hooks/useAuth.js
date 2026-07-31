import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'
import { loginApi, signupApi, logoutApi } from '../api/auth.js'
import { saveSession, clearSession } from '../utils/authStorage.js'

export function useAuth() {
  const { user, token, isLoading, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password)
    saveSession(data.token, data.user)
    setAuth(data.user, data.token)
    navigate('/dashboard')
  }, [setAuth, navigate])

  const signup = useCallback(async (name, email, password) => {
    const data = await signupApi(name, email, password)
    saveSession(data.token, data.user)
    setAuth(data.user, data.token)
    navigate('/dashboard')
  }, [setAuth, navigate])

  const logout = useCallback(async () => {
    try { await logoutApi() } catch {}
    clearSession()
    clearAuth()
    navigate('/login')
  }, [clearAuth, navigate])

  return { user, token, isLoading, login, signup, logout }
}

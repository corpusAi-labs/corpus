import { useEffect, useRef } from 'react'
import axios from 'axios'
import useAuthStore from '../store/authStore.js'
import { isLoggedIn, saveSession, clearSession, getRefreshToken, getStoredUser, getToken, isTokenValid } from '../utils/authStorage.js'
import { BASE } from '../api/axios.js'

export default function AuthInit({ children }) {
  const { setAuth, clearAuth } = useAuthStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function restoreSession() {
      if (!isLoggedIn()) {
        clearAuth()
        return
      }

      const storedUser = getStoredUser()
      const storedToken = getToken()

      // Ensure Zustand has initial stored data immediately if not already set
      if (storedUser && storedToken) {
        setAuth(storedUser, storedToken)
        // If the access token is still valid, no need to force a refresh call on every reload!
        if (isTokenValid(storedToken)) {
          return
        }
      }

      try {
        const refreshToken = getRefreshToken()
        const { data } = await axios.post(
          `${BASE}/auth/refresh`,
          { refreshToken },
          {
            withCredentials: true,
            timeout: 10000,
          }
        )
        setAuth(data.user, data.token)
        saveSession(data.user, data.token, data.refreshToken)
      } catch (err) {
        console.warn('[auth init] session restoration failed:', err.message)
        // Only clear authentication if explicitly unauthorized/forbidden by backend and token is expired
        if ((err.response?.status === 401 || err.response?.status === 403) && !isTokenValid(storedToken)) {
          clearSession()
          clearAuth()
        }
      }
    }

    restoreSession()
  }, [setAuth, clearAuth])

  return children
}


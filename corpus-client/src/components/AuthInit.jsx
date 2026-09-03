import { useEffect, useRef } from 'react'
import axios from 'axios'
import useAuthStore from '../store/authStore.js'
import { saveSession, clearSession, getStoredUser } from '../utils/authStorage.js'
import { BASE } from '../api/axios.js'

export default function AuthInit({ children }) {
  const { setAuth, clearAuth, setLoading } = useAuthStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function restoreSession() {
      // Immediately hydrate cached user profile if present
      const storedUser = getStoredUser()
      if (storedUser) {
        setAuth(storedUser)
      }

      setLoading(true)

      try {
        // Silently verify session and refresh httpOnly cookies with server
        const { data } = await axios.post(
          `${BASE}/auth/refresh`,
          {},
          {
            withCredentials: true,
            timeout: 10000,
          }
        )
        setAuth(data.user)
        saveSession(data.user)
      } catch (err) {
        console.warn('[auth init] session restoration failed:', err.message)
        clearSession()
        clearAuth()
      }
    }

    restoreSession()
  }, [setAuth, clearAuth, setLoading])

  return children
}



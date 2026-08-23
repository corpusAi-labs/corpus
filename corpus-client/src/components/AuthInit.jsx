import { useEffect, useRef } from 'react'
import axios from 'axios'
import useAuthStore from '../store/authStore.js'
import { isLoggedIn, saveSession, clearSession } from '../utils/authStorage.js'
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

      try {
        const { data } = await axios.post(
          `${BASE}/auth/refresh`,
          {},
          {
            withCredentials: true,
            timeout: 10000,
          }
        )
        setAuth(data.user, data.token)
        saveSession(data.user)
      } catch (err) {
        console.warn('[auth init] session restoration failed:', err.message)
        clearSession()
        clearAuth()
      }
    }

    restoreSession()
  }, [setAuth, clearAuth])

  return children
}

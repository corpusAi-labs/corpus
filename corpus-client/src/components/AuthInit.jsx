import { useEffect, useRef } from 'react'
import axios from 'axios'
import useAuthStore from '../store/authStore.js'
import { getToken, clearSession } from '../utils/authStorage.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export default function AuthInit({ children }) {
  const { setAuth, clearAuth } = useAuthStore()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function restoreSession() {
      const token = getToken()
      if (!token) {
        clearAuth()
        return
      }

      try {
        const { data } = await axios.get(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        })
        setAuth(data.user, token)
      } catch {
        clearSession()
        clearAuth()
      }
    }

    restoreSession()
  }, [setAuth, clearAuth])

  return children
}

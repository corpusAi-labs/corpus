import axios from 'axios'
import useAuthStore from '../store/authStore.js'
import { clearSession, saveSession, getToken, getRefreshToken } from '../utils/authStorage.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry auth request endpoints directly to avoid infinite loop
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/signup') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        useAuthStore.getState().clearAuth()
        clearSession()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const storedRefreshToken = getRefreshToken()
        // Use standard axios instance to refresh to bypass interceptor logic
        const { data } = await axios.post(
          `${BASE}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { withCredentials: true }
        )
        const { token, user, refreshToken } = data

        useAuthStore.getState().setAuth(user, token)
        saveSession(user, token, refreshToken)

        originalRequest.headers.Authorization = `Bearer ${token}`
        processQueue(null, token)
        isRefreshing = false

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        useAuthStore.getState().clearAuth()
        clearSession()
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
export { BASE }


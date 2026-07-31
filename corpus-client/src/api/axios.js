import axios from 'axios'
import useAuthStore from '../store/authStore.js'
import { clearSession } from '../utils/authStorage.js'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: BASE,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession()
      useAuthStore.getState().clearAuth()
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

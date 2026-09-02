import { create } from 'zustand'
import { getStoredUser, getToken } from '../utils/authStorage.js'

const initialUser = getStoredUser()
const initialToken = getToken()

const useAuthStore = create((set) => ({
  user: initialUser,
  token: initialToken,
  isLoading: false,

  setAuth: (user, token) => set({
    user,
    token,
    isLoading: false,
  }),

  setCredits: (credits) => set((s) => ({
    user: s.user ? { ...s.user, credits } : s.user,
  })),

  clearAuth: () => set({ user: null, token: null, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}))

export default useAuthStore


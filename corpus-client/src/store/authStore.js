import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: true,

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

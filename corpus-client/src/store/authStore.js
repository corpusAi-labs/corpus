import { create } from 'zustand'
import { getStoredUser} from '../utils/authStorage.js'

const initialUser = getStoredUser()

const useAuthStore = create((set) => ({
  user: initialUser,
  isLoading: true,

  setAuth: (user) => set({ user, isLoading: false }),
  clearAuth: () => set({ user: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}))

export default useAuthStore


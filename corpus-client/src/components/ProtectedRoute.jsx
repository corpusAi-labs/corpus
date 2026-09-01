import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fff8f4] flex items-center justify-center">
        <span className="font-circular text-[12px] uppercase tracking-wider text-gray-500 font-bold">
          loading…
        </span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

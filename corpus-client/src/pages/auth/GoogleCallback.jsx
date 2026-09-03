import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../../store/authStore.js'
import { saveSession } from '../../utils/authStorage.js'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const dataParam = searchParams.get('data')
    if (dataParam) {
      try {
        const { user } = JSON.parse(decodeURIComponent(dataParam))
        if (user) {
          saveSession(user)
          setAuth(user)
        }
      } catch {}
    }
    navigate('/dashboard', { replace: true })
  }, [searchParams, navigate, setAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f4]">
      <div className="bg-white border-2 border-black p-8 rounded-[10px] shadow-[6px_6px_0px_black] text-center">
        <p className="font-circular text-[15px] font-bold text-black mb-2">Completing Google Sign In…</p>
        <p className="font-circular text-[12px] text-gray-500">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}

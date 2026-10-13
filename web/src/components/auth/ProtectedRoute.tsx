import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'

export function ProtectedRoute() {
  const { status, user } = useAppSelector((state) => state.auth)

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="neuro-raised-sm rounded-3xl px-6 py-4">جاري التحميل...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

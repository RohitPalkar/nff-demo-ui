import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Role } from '@/types'

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode
  roles?: Role[]
}) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }
  return <>{children}</>
}

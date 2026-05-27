import { Navigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { useRole } from '../hooks/useRole'
import type { UserRole } from '../types/user'
import type { ReactNode } from 'react'

interface RoleRouteProps {
  children?: ReactNode
  minRole: UserRole
}

export function RoleRoute({ children, minRole }: RoleRouteProps) {
  const { user } = useAuthContext()
  const { hasRole } = useRole(user)

  if (!hasRole(minRole)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

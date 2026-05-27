import type { UserProfile, UserRole } from '../types/user'

export function useRole(user: UserProfile | null) {
  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'admin' || user?.role === 'staff'
  const isViewer = user !== null

  function hasRole(role: UserRole): boolean {
    if (!user) return false
    if (role === 'viewer') return true
    if (role === 'staff') return user.role === 'staff' || user.role === 'admin'
    return user.role === 'admin'
  }

  return { isAdmin, isStaff, isViewer, hasRole }
}

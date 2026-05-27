export type UserRole = 'admin' | 'staff' | 'viewer'

export interface UserProfile {
  uid: string
  username: string
  usernameLower: string
  email: string
  displayName: string
  role: UserRole
  active: boolean
  createdAt: Date
  updatedAt: Date
}

import type { PermissionModule, Role } from './roles'

export interface AuthUser {
  id: number
  name: string
  username: string
  role: Role
  permissions: PermissionModule[]
}

export interface AuthStatus {
  initialized: boolean
  user: AuthUser | null
  businessName: string
  version: string
}

export interface UserRecord {
  id: number
  name: string
  username: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AppInfo {
  version: string
  electron: string
  platform: string
}

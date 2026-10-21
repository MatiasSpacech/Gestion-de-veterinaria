import type { AuthUser } from '@shared/types'

let currentUser: AuthUser | null = null

export function getSessionUser(): AuthUser | null {
  return currentUser
}

export function setSessionUser(user: AuthUser): void {
  currentUser = user
}

export function clearSession(): void {
  currentUser = null
}

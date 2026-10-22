import {
  authenticate,
  isInitialized,
  setupAdmin
} from '@desktop/services/auth'
import type Database from 'better-sqlite3'
import type { LoginInput, SetupAdminInput } from '@shared/schemas'
import type { AuthUser } from '@shared/types'

import { getMobileDatabase } from '../db'

let currentUser: AuthUser | null = null
const listeners = new Set<(user: AuthUser | null) => void>()

function notify(): void {
  for (const listener of listeners) {
    listener(currentUser)
  }
}

export function getSessionUser(): AuthUser | null {
  return currentUser
}

export function setSessionUser(user: AuthUser | null): void {
  currentUser = user
  notify()
}

export function isDatabaseInitialized(
  db: Database.Database = getMobileDatabase()
): boolean {
  return isInitialized(db)
}

export function signIn(
  input: LoginInput,
  db: Database.Database = getMobileDatabase()
): AuthUser {
  const user = authenticate(db, input.username, input.password)

  setSessionUser(user)

  return user
}

export function signOut(): void {
  setSessionUser(null)
}

export function createFirstAdmin(
  input: SetupAdminInput,
  db: Database.Database = getMobileDatabase()
): AuthUser {
  const user = setupAdmin(db, input)

  setSessionUser(user)

  return user
}

export function subscribeToSession(
  listener: (user: AuthUser | null) => void
): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

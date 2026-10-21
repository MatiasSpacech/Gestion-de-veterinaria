import type { IpcResult } from '@shared/ipc'
import type {
  ChangePasswordInput,
  LoginInput,
  SetupAdminInput
} from '@shared/schemas'

export class ApiClientError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.details = details
  }
}

async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise

  if (result.ok) {
    return result.data
  }

  throw new ApiClientError(result.error.code, result.error.message, result.error.details)
}

export const api = {
  auth: {
    status: () => unwrap(window.api.auth.status()),
    setup: (input: SetupAdminInput) => unwrap(window.api.auth.setup(input)),
    login: (input: LoginInput) => unwrap(window.api.auth.login(input)),
    logout: () => unwrap(window.api.auth.logout()),
    changePassword: (input: ChangePasswordInput) =>
      unwrap(window.api.auth.changePassword(input))
  },
  users: {
    list: () => unwrap(window.api.users.list()),
    create: (input: Parameters<typeof window.api.users.create>[0]) =>
      unwrap(window.api.users.create(input)),
    update: (input: Parameters<typeof window.api.users.update>[0]) =>
      unwrap(window.api.users.update(input)),
    resetPassword: (input: Parameters<typeof window.api.users.resetPassword>[0]) =>
      unwrap(window.api.users.resetPassword(input))
  },
  app: {
    info: () => unwrap(window.api.app.info())
  }
}

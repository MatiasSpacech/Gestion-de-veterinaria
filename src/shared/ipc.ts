import type {
  ChangePasswordInput,
  CreateUserInput,
  LoginInput,
  ResetPasswordInput,
  SetupAdminInput,
  UpdateUserInput
} from './schemas'
import type { AppInfo, AuthStatus, UserRecord } from './types'

export const IPC = {
  auth: {
    status: 'auth:status',
    setup: 'auth:setup',
    login: 'auth:login',
    logout: 'auth:logout',
    changePassword: 'auth:change-password'
  },
  users: {
    list: 'users:list',
    create: 'users:create',
    update: 'users:update',
    resetPassword: 'users:reset-password'
  },
  app: {
    info: 'app:info'
  }
} as const

export interface IpcError {
  code: string
  message: string
  details?: unknown
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

export interface VetApi {
  auth: {
    status: () => Promise<IpcResult<AuthStatus>>
    setup: (input: SetupAdminInput) => Promise<IpcResult<AuthStatus>>
    login: (input: LoginInput) => Promise<IpcResult<AuthStatus>>
    logout: () => Promise<IpcResult<AuthStatus>>
    changePassword: (input: ChangePasswordInput) => Promise<IpcResult<null>>
  }
  users: {
    list: () => Promise<IpcResult<UserRecord[]>>
    create: (input: CreateUserInput) => Promise<IpcResult<UserRecord>>
    update: (input: UpdateUserInput) => Promise<IpcResult<UserRecord>>
    resetPassword: (input: ResetPasswordInput) => Promise<IpcResult<null>>
  }
  app: {
    info: () => Promise<IpcResult<AppInfo>>
  }
}

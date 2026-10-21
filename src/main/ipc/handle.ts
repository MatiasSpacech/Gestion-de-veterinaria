import { ipcMain } from 'electron'
import log from 'electron-log/main'
import { ZodError, type ZodType } from 'zod'
import { AppError } from '@shared/errors'
import type { IpcResult } from '@shared/ipc'
import type { PermissionModule } from '@shared/roles'
import type { AuthUser } from '@shared/types'
import { getDb } from '@main/db'
import { getSessionUser } from '@main/session'
import { hasPermission } from '@main/services/auth'
import { toIpcError } from './errors'

interface ProtectedOptions {
  adminOnly?: boolean
  permission?: PermissionModule
}

function logUnexpected(channel: string, error: unknown): void {
  if (!(error instanceof AppError) && !(error instanceof ZodError)) {
    log.error(`[ipc] Error no controlado en ${channel}`, error)
  }
}

export function registerPublicHandler<TInput = void, TOutput = void>(
  channel: string,
  schema: ZodType<TInput> | null,
  handler: (input: TInput) => TOutput | Promise<TOutput>
): void {
  ipcMain.removeHandler(channel)

  ipcMain.handle(channel, async (_event, payload): Promise<IpcResult<TOutput>> => {
    try {
      const input = schema ? schema.parse(payload) : (undefined as TInput)
      const data = await handler(input)
      return { ok: true, data }
    } catch (error) {
      logUnexpected(channel, error)
      return { ok: false, error: toIpcError(error) }
    }
  })
}

export function registerProtectedHandler<TInput = void, TOutput = void>(
  channel: string,
  schema: ZodType<TInput> | null,
  handler: (input: TInput, user: AuthUser) => TOutput | Promise<TOutput>,
  options: ProtectedOptions = {}
): void {
  ipcMain.removeHandler(channel)

  ipcMain.handle(channel, async (_event, payload): Promise<IpcResult<TOutput>> => {
    try {
      const user = getSessionUser()

      if (!user) {
        throw new AppError('UNAUTHORIZED', 'Tu sesión no está iniciada')
      }

      if (options.adminOnly && user.role !== 'admin') {
        throw new AppError('FORBIDDEN', 'No tenés permisos para realizar esta acción')
      }

      if (options.permission && !hasPermission(getDb(), user.role, options.permission)) {
        throw new AppError('FORBIDDEN', 'No tenés acceso a este módulo')
      }

      const input = schema ? schema.parse(payload) : (undefined as TInput)
      const data = await handler(input, user)
      return { ok: true, data }
    } catch (error) {
      logUnexpected(channel, error)
      return { ok: false, error: toIpcError(error) }
    }
  })
}

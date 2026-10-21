import { ZodError } from 'zod'
import { AppError } from '@shared/errors'
import type { IpcError } from '@shared/ipc'

export function toIpcError(error: unknown): IpcError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    }
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0]
    return {
      code: 'VALIDATION_ERROR',
      message: firstIssue?.message ?? 'Los datos enviados no son válidos',
      details: error.issues
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Ocurrió un error inesperado. Revisá el registro de la aplicación.'
  }
}

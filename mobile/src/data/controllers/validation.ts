import { ZodError, type ZodType } from 'zod'
import { AppError } from '@shared/errors'

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw toAppError(result.error)
  }

  return result.data
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0]

    return new AppError(
      'VALIDATION_ERROR',
      firstIssue?.message ?? 'Los datos enviados no son válidos',
      error.issues
    )
  }

  return new AppError(
    'INTERNAL_ERROR',
    'Ocurrió un error inesperado. Revisá el registro de la aplicación.'
  )
}

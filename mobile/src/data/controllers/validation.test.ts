import { describe, expect, it } from 'vitest'
import { loginSchema, setupAdminSchema } from '@shared/schemas'
import { AppError } from '@shared/errors'

import { parseInput, toAppError } from './validation'

describe('validación de entradas', () => {
  it('acepta credenciales válidas', () => {
    const input = parseInput(loginSchema, {
      username: ' admin ',
      password: 'claveSegura123'
    })

    expect(input.username).toBe('admin')
  })

  it('devuelve VALIDATION_ERROR con el mensaje del esquema', () => {
    try {
      parseInput(loginSchema, { username: '', password: '' })
      throw new Error('debía fallar')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('VALIDATION_ERROR')
      expect((error as AppError).message).toBe('Ingresá tu usuario')
    }
  })

  it('rechaza contraseñas que no coinciden en el setup', () => {
    try {
      parseInput(setupAdminSchema, {
        name: 'Administrador',
        username: 'admin',
        password: 'claveSegura123',
        confirmPassword: 'otraClave'
      })
      throw new Error('debía fallar')
    } catch (error) {
      expect((error as AppError).message).toBe('Las contraseñas no coinciden')
    }
  })

  it('convierte errores desconocidos en INTERNAL_ERROR', () => {
    const error = toAppError(new Error('boom'))

    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.message).toContain('error inesperado')
  })

  it('mantiene el AppError original', () => {
    const original = new AppError('NOT_FOUND', 'No existe')

    expect(toAppError(original)).toBe(original)
  })
})

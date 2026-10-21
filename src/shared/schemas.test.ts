import { describe, expect, it } from 'vitest'
import {
  changePasswordSchema,
  createUserSchema,
  setupAdminSchema
} from './schemas'

describe('validaciones de autenticación', () => {
  it('acepta una configuración inicial válida', () => {
    const result = setupAdminSchema.safeParse({
      name: 'Ana Pérez',
      username: 'ana.perez',
      password: 'secreto123',
      confirmPassword: 'secreto123'
    })

    expect(result.success).toBe(true)
  })

  it('rechaza contraseñas cortas y confirmaciones diferentes', () => {
    const shortPassword = setupAdminSchema.safeParse({
      name: 'Ana Pérez',
      username: 'ana',
      password: 'corta',
      confirmPassword: 'corta'
    })
    const mismatch = setupAdminSchema.safeParse({
      name: 'Ana Pérez',
      username: 'ana',
      password: 'secreto123',
      confirmPassword: 'secreto456'
    })

    expect(shortPassword.success).toBe(false)
    expect(mismatch.success).toBe(false)
  })

  it('rechaza usuarios con caracteres no permitidos', () => {
    const result = createUserSchema.safeParse({
      name: 'Carlos Gómez',
      username: 'carlos gomez',
      password: 'secreto123',
      role: 'vendedor'
    })

    expect(result.success).toBe(false)
  })

  it('no permite reutilizar la contraseña actual', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'secreto123',
      newPassword: 'secreto123',
      confirmPassword: 'secreto123'
    })

    expect(result.success).toBe(false)
  })
})

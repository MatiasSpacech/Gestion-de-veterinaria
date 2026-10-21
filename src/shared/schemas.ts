import { z } from 'zod'
import { ROLES } from './roles'

const nameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(80, 'El nombre no puede superar los 80 caracteres')

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(30, 'El usuario no puede superar los 30 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo se permiten letras, números, puntos, guiones y guiones bajos')

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña no puede superar los 128 caracteres')

const roleSchema = z.enum(ROLES)

export const setupAdminSchema = z
  .object({
    name: nameSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirmá la contraseña')
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  })

export type SetupAdminInput = z.infer<typeof setupAdminSchema>

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Ingresá tu usuario').max(30),
  password: z.string().min(1, 'Ingresá tu contraseña').max(128)
})

export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual').max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirmá la nueva contraseña')
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'La nueva contraseña debe ser diferente a la actual',
    path: ['newPassword']
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export const createUserSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  password: passwordSchema,
  role: roleSchema
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  id: z.number().int().positive(),
  name: nameSchema,
  username: usernameSchema,
  role: roleSchema,
  active: z.boolean()
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const resetPasswordSchema = z
  .object({
    id: z.number().int().positive(),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirmá la nueva contraseña')
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

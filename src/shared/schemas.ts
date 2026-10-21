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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `El texto no puede superar los ${max} caracteres`)
    .nullable()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))

const optionalEmail = z
  .string()
  .trim()
  .max(120, 'El correo no puede superar los 120 caracteres')
  .nullable()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    'Ingresá un correo válido'
  )

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá una fecha válida')

const optionalIsoDate = isoDateSchema
  .nullable()
  .optional()
  .transform((value) => value ?? null)

const optionalWeight = z
  .number()
  .finite()
  .min(0, 'El peso no puede ser negativo')
  .max(500, 'El peso no puede superar los 500 kg')
  .nullable()
  .optional()
  .transform((value) => value ?? null)

const idSchema = z.number().int().positive()

const photoFileNameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i,
    'El archivo de la foto no es válido'
  )
  .nullable()
  .optional()
  .transform((value) => value ?? null)

const petSexSchema = z.enum(['macho', 'hembra', 'desconocido'])

export const medicalRecordTypeSchema = z.enum([
  'consulta',
  'vacuna',
  'desparasitacion',
  'cirugia',
  'tratamiento',
  'nota',
  'peso'
])

const clientFieldsSchema = z.object({
  name: nameSchema,
  docNumber: optionalText(30),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(200),
  notes: optionalText(1000)
})

export const createClientSchema = clientFieldsSchema

export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientSchema = clientFieldsSchema.extend({
  id: idSchema
})

export type UpdateClientInput = z.infer<typeof updateClientSchema>

export const getByIdSchema = z.object({
  id: idSchema
})

export type GetByIdInput = z.infer<typeof getByIdSchema>

export const setActiveSchema = z.object({
  id: idSchema,
  active: z.boolean()
})

export type SetActiveInput = z.infer<typeof setActiveSchema>

export const listClientsSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  includeInactive: z.boolean().optional().default(false)
})

export type ListClientsInput = z.infer<typeof listClientsSchema>

const petFieldsSchema = z.object({
  clientId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre de la mascota')
    .max(80, 'El nombre no puede superar los 80 caracteres'),
  species: z
    .string()
    .trim()
    .min(1, 'Ingresá la especie')
    .max(40, 'La especie no puede superar los 40 caracteres'),
  breed: optionalText(80),
  sex: petSexSchema,
  birthDate: optionalIsoDate,
  color: optionalText(60),
  weightKg: optionalWeight,
  sterilized: z.boolean().default(false),
  allergies: optionalText(1000),
  chronicConditions: optionalText(1000),
  notes: optionalText(1000),
  photoFileName: photoFileNameSchema
})

export const createPetSchema = petFieldsSchema

export type CreatePetInput = z.infer<typeof createPetSchema>

export const updatePetSchema = petFieldsSchema.extend({
  id: idSchema
})

export type UpdatePetInput = z.infer<typeof updatePetSchema>

export const listPetsSchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  clientId: idSchema.nullable().optional().default(null),
  includeInactive: z.boolean().optional().default(false)
})

export type ListPetsInput = z.infer<typeof listPetsSchema>

export const listMedicalRecordsSchema = z.object({
  petId: idSchema,
  type: medicalRecordTypeSchema.nullable().optional().default(null)
})

export type ListMedicalRecordsInput = z.infer<typeof listMedicalRecordsSchema>

export const createMedicalRecordSchema = z
  .object({
    petId: idSchema,
    type: medicalRecordTypeSchema,
    date: isoDateSchema,
    title: z
      .string()
      .trim()
      .min(2, 'El título debe tener al menos 2 caracteres')
      .max(120, 'El título no puede superar los 120 caracteres'),
    description: optionalText(2000),
    diagnosis: optionalText(2000),
    treatment: optionalText(2000),
    vetName: optionalText(120),
    weightKg: optionalWeight,
    nextDueDate: optionalIsoDate
  })
  .superRefine((value, ctx) => {
    if (value.type === 'peso' && value.weightKg === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['weightKg'],
        message: 'Ingresá el peso registrado'
      })
    }

    if (value.type === 'vacuna' && value.nextDueDate === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['nextDueDate'],
        message: 'Indicá la próxima dosis'
      })
    }

    if (
      value.type === 'vacuna' &&
      value.nextDueDate !== null &&
      value.nextDueDate <= value.date
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['nextDueDate'],
        message: 'La próxima dosis debe ser posterior a la fecha de aplicación'
      })
    }
  })

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>

export const weightHistorySchema = z.object({
  petId: idSchema
})

export type WeightHistoryInput = z.infer<typeof weightHistorySchema>

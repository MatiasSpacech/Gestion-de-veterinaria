import dayjs from 'dayjs'
import type { PetSex } from '@shared/types'

const SEX_LABELS: Record<PetSex, string> = {
  macho: 'Macho',
  hembra: 'Hembra',
  desconocido: 'Sin dato'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = dayjs(value)

  return date.isValid() ? date.format('DD/MM/YYYY') : '—'
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = dayjs(value)

  return date.isValid() ? date.format('DD MMM') : '—'
}

export function formatPetSex(sex: PetSex): string {
  return SEX_LABELS[sex]
}

export function formatWeight(weightKg: number | null | undefined): string {
  if (weightKg === null || weightKg === undefined) {
    return '—'
  }

  return `${weightKg.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} kg`
}

export function calculateAge(birthDate: string | null | undefined): string {
  if (!birthDate) {
    return 'Edad sin dato'
  }

  const birth = dayjs(birthDate)

  if (!birth.isValid() || birth.isAfter(dayjs())) {
    return 'Edad sin dato'
  }

  const months = dayjs().diff(birth, 'month')

  if (months < 1) {
    const days = Math.max(dayjs().diff(birth, 'day'), 0)
    return days === 1 ? '1 día' : `${days} días`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return remainingMonths === 1 ? '1 mes' : `${remainingMonths} meses`
  }

  const yearLabel = years === 1 ? '1 año' : `${years} años`

  if (remainingMonths === 0) {
    return yearLabel
  }

  return `${yearLabel} y ${remainingMonths} ${remainingMonths === 1 ? 'mes' : 'meses'}`
}

export function formatDueIn(daysUntil: number): string {
  if (daysUntil < 0) {
    const days = Math.abs(daysUntil)
    return days === 1 ? 'Vencida hace 1 día' : `Vencida hace ${days} días`
  }

  if (daysUntil === 0) {
    return 'Vence hoy'
  }

  if (daysUntil === 1) {
    return 'Vence mañana'
  }

  return `Vence en ${daysUntil} días`
}

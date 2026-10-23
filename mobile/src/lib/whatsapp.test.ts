import { describe, expect, it } from 'vitest'

import {
  buildAppointmentWhatsAppUrl,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
  renderWhatsAppTemplate
} from './whatsapp'

describe('normalizeWhatsAppPhone', () => {
  it('normaliza un número local de diez dígitos', () => {
    expect(normalizeWhatsAppPhone('11 5555-0000')).toBe('5491155550000')
  })

  it('quita el cero y el quince de los celulares argentinos', () => {
    expect(normalizeWhatsAppPhone('011 15 5555-0000')).toBe('5491155550000')
  })

  it('acepta el formato internacional con 54 y 9', () => {
    expect(normalizeWhatsAppPhone('+54 9 11 5555-0000')).toBe('5491155550000')
  })

  it('rechaza teléfonos incompletos o vacíos', () => {
    expect(normalizeWhatsAppPhone('555-0000')).toBeNull()
    expect(normalizeWhatsAppPhone(null)).toBeNull()
    expect(normalizeWhatsAppPhone('')).toBeNull()
  })
})

describe('renderWhatsAppTemplate', () => {
  it('reemplaza todas las variables del recordatorio', () => {
    const message = renderWhatsAppTemplate(
      'Hola {cliente}, {mascota} tiene turno el {fecha} a las {hora} en {negocio}.',
      {
        cliente: 'Ana',
        mascota: 'Luna',
        servicio: 'Baño',
        fecha: '12/05/2026',
        hora: '10:30',
        negocio: 'VetGestión'
      }
    )

    expect(message).toBe(
      'Hola Ana, Luna tiene turno el 12/05/2026 a las 10:30 en VetGestión.'
    )
  })

  it('deja intacto el texto sin variables', () => {
    expect(
      renderWhatsAppTemplate('Recordatorio', {
        cliente: 'Ana',
        mascota: 'Luna',
        servicio: 'Baño',
        fecha: '12/05/2026',
        hora: '10:30',
        negocio: 'VetGestión'
      })
    ).toBe('Recordatorio')
  })
})

describe('buildWhatsAppUrl', () => {
  it('codifica el mensaje para wa.me', () => {
    expect(buildWhatsAppUrl('5491155550000', 'Hola mundo')).toBe(
      'https://wa.me/5491155550000?text=Hola%20mundo'
    )
  })

  it('devuelve null cuando el teléfono no es válido', () => {
    expect(
      buildAppointmentWhatsAppUrl('123', 'Hola {cliente}', {
        cliente: 'Ana',
        mascota: 'Luna',
        servicio: 'Baño',
        fecha: '12/05/2026',
        hora: '10:30',
        negocio: 'VetGestión'
      })
    ).toBeNull()
  })
})

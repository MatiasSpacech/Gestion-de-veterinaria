export interface WhatsAppTemplateValues {
  cliente: string
  mascota: string
  servicio: string
  fecha: string
  hora: string
  negocio: string
}

/**
 * Normaliza teléfonos argentinos al formato que espera `wa.me`.
 * Acepta formatos como `11 5555-0000`, `011 15 5555-0000` y `+54 9 11 5555-0000`.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  let digits = raw.replace(/\D/g, '')

  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  if (digits.startsWith('54')) {
    digits = digits.slice(2)

    if (digits.startsWith('9')) {
      digits = digits.slice(1)
    }
  }

  digits = digits.replace(/^0+/, '')

  for (const index of [2, 3, 4]) {
    if (digits.slice(index, index + 2) === '15') {
      const candidate = digits.slice(0, index) + digits.slice(index + 2)

      if (candidate.length === 10) {
        digits = candidate
        break
      }
    }
  }

  if (digits.length !== 10) {
    return null
  }

  return `549${digits}`
}

export function renderWhatsAppTemplate(
  template: string,
  values: WhatsAppTemplateValues
): string {
  const replacements: Record<string, string> = {
    '{cliente}': values.cliente,
    '{mascota}': values.mascota,
    '{servicio}': values.servicio,
    '{fecha}': values.fecha,
    '{hora}': values.hora,
    '{negocio}': values.negocio
  }

  return Object.entries(replacements).reduce(
    (message, [placeholder, value]) => message.split(placeholder).join(value),
    template
  )
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function buildAppointmentWhatsAppUrl(
  phone: string | null | undefined,
  template: string,
  values: WhatsAppTemplateValues
): string | null {
  const normalized = normalizeWhatsAppPhone(phone)

  if (!normalized) {
    return null
  }

  return buildWhatsAppUrl(normalized, renderWhatsAppTemplate(template, values))
}

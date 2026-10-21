import {
  IconBug,
  IconClipboardText,
  IconFirstAidKit,
  IconPill,
  IconScale,
  IconStethoscope,
  IconVaccine,
  type TablerIcon
} from '@tabler/icons-react'
import type { MedicalRecordType } from '@shared/types'

export interface RecordTypeDefinition {
  label: string
  color: string
  icon: TablerIcon
}

export const RECORD_TYPES: Record<MedicalRecordType, RecordTypeDefinition> = {
  consulta: { label: 'Consulta', color: 'blue', icon: IconStethoscope },
  vacuna: { label: 'Vacuna', color: 'violet', icon: IconVaccine },
  desparasitacion: { label: 'Desparasitación', color: 'orange', icon: IconBug },
  cirugia: { label: 'Cirugía', color: 'red', icon: IconFirstAidKit },
  tratamiento: { label: 'Tratamiento', color: 'teal', icon: IconPill },
  nota: { label: 'Nota', color: 'gray', icon: IconClipboardText },
  peso: { label: 'Peso', color: 'vetGreen', icon: IconScale }
}

export const RECORD_TYPE_OPTIONS = Object.entries(RECORD_TYPES).map(
  ([value, definition]) => ({
    value,
    label: definition.label
  })
)

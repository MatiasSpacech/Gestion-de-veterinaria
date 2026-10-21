import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { MedicalRecordType } from '@shared/types'
import { api } from '@renderer/lib/api'
import { RECORD_TYPE_OPTIONS } from './record-types'

interface MedicalRecordModalProps {
  opened: boolean
  onClose: () => void
  petId: number
}

interface MedicalRecordFormValues {
  type: MedicalRecordType
  date: string
  title: string
  description: string
  diagnosis: string
  treatment: string
  vetName: string
  weightKg: number | string
  nextDueDate: string
}

const TITLE_PLACEHOLDERS: Record<MedicalRecordType, string> = {
  consulta: 'Ej. Control general',
  vacuna: 'Ej. Vacuna antirrábica',
  desparasitacion: 'Ej. Desparasitación trimestral',
  cirugia: 'Ej. Castración',
  tratamiento: 'Ej. Tratamiento antibiótico',
  nota: 'Ej. Observación de seguimiento',
  peso: 'Ej. Control mensual de peso'
}

export function MedicalRecordModal({
  opened,
  onClose,
  petId
}: MedicalRecordModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<MedicalRecordFormValues>({
    initialValues: {
      type: 'consulta',
      date: dayjs().format('YYYY-MM-DD'),
      title: '',
      description: '',
      diagnosis: '',
      treatment: '',
      vetName: '',
      weightKg: '',
      nextDueDate: ''
    },
    validate: {
      date: (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Ingresá la fecha',
      title: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá un título descriptivo',
      weightKg: (value, values) => {
        if (value === '' || value === null || value === undefined) {
          return values.type === 'peso' ? 'Ingresá el peso registrado' : null
        }

        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue >= 0
          ? null
          : 'Ingresá un peso válido'
      },
      nextDueDate: (value, values) => {
        if (values.type !== 'vacuna') {
          return null
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return 'Indicá la fecha de la próxima dosis'
        }

        return value > values.date
          ? null
          : 'La próxima dosis debe ser posterior a la aplicación'
      }
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    setValues({
      type: 'consulta',
      date: dayjs().format('YYYY-MM-DD'),
      title: '',
      description: '',
      diagnosis: '',
      treatment: '',
      vetName: '',
      weightKg: '',
      nextDueDate: ''
    })
    resetDirty()
  }, [opened, petId, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await api.pets.createMedicalRecord({
          petId,
          type: values.type,
          date: values.date,
          title: values.title,
          description: values.description,
          diagnosis: values.diagnosis,
          treatment: values.treatment,
          vetName: values.vetName,
          weightKg:
            values.weightKg === '' || values.weightKg === null
              ? null
              : Number(values.weightKg),
          nextDueDate: values.nextDueDate || null
        })

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['pet', petId] }),
          queryClient.invalidateQueries({ queryKey: ['pet-records', petId] }),
          queryClient.invalidateQueries({ queryKey: ['pet-weights', petId] }),
          queryClient.invalidateQueries({ queryKey: ['pets'] }),
          queryClient.invalidateQueries({ queryKey: ['upcoming-vaccines'] })
        ])

        notifications.show({
          color: 'vetGreen',
          title: 'Registro guardado',
          message: 'El historial clínico se actualizó correctamente.'
        })

        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar el registro',
          message: error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setLoading(false)
      }
    })(event)
  }

  const isVaccine = form.values.type === 'vacuna'
  const isWeight = form.values.type === 'peso'

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Nuevo registro clínico"
      size="lg"
      centered
      closeOnClickOutside={!loading}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Tipo de registro"
              data={RECORD_TYPE_OPTIONS}
              allowDeselect={false}
              data-autofocus
              {...form.getInputProps('type')}
            />
            <TextInput
              label="Fecha"
              type="date"
              {...form.getInputProps('date')}
            />
          </SimpleGrid>

          <TextInput
            label="Título"
            placeholder={TITLE_PLACEHOLDERS[form.values.type]}
            {...form.getInputProps('title')}
          />

          <Textarea
            label="Descripción"
            placeholder="Detalle del registro"
            minRows={2}
            autosize
            {...form.getInputProps('description')}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Textarea
              label="Diagnóstico"
              placeholder="Opcional"
              minRows={2}
              autosize
              {...form.getInputProps('diagnosis')}
            />
            <Textarea
              label="Tratamiento"
              placeholder="Opcional"
              minRows={2}
              autosize
              {...form.getInputProps('treatment')}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Profesional"
              placeholder="Nombre del veterinario"
              {...form.getInputProps('vetName')}
            />
            <NumberInput
              label={isWeight ? 'Peso registrado (kg) *' : 'Peso registrado (kg)'}
              placeholder="Opcional"
              min={0}
              max={500}
              decimalScale={2}
              step={0.1}
              {...form.getInputProps('weightKg')}
            />
          </SimpleGrid>

          <TextInput
            label={isVaccine ? 'Próxima dosis *' : 'Próxima dosis'}
            type="date"
            description={
              isVaccine
                ? 'Se usará para el recordatorio de vacunas.'
                : 'Opcional para otros tipos de registro.'
            }
            {...form.getInputProps('nextDueDate')}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar registro
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

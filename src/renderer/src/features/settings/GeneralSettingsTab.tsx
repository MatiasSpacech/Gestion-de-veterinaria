import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Card,
  Chip,
  Divider,
  Group,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconAlertTriangle, IconDeviceFloppy } from '@tabler/icons-react'
import type { UpdateSettingsInput } from '@shared/schemas'
import { api } from '@renderer/lib/api'
import { useAuth } from '@renderer/lib/use-auth'
import { DAY_OPTIONS } from './settings-constants'

interface GeneralFormValues {
  name: string
  address: string
  phone: string
  email: string
  openDays: string[]
  openTime: string
  closeTime: string
  slotMinutes: number | string
  expiryAlertDays: number | string
  vaccineAlertDays: number | string
  whatsappTemplate: string
}

const DEFAULT_VALUES: GeneralFormValues = {
  name: '',
  address: '',
  phone: '',
  email: '',
  openDays: ['1', '2', '3', '4', '5', '6'],
  openTime: '09:00',
  closeTime: '19:00',
  slotMinutes: 30,
  expiryAlertDays: 30,
  vaccineAlertDays: 15,
  whatsappTemplate:
    'Hola {cliente}, te recordamos el turno de {mascota} el {fecha} a las {hora} en {negocio}. Servicios: {servicios}.'
}

function integerValue(value: number | string, min: number, max: number): string | null {
  const number = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(number) || number < min || number > max) {
    return `Ingresá un número entero entre ${min} y ${max}`
  }

  return null
}

export function GeneralSettingsTab(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { refresh } = useAuth()
  const [saving, setSaving] = useState(false)
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get
  })
  const form = useForm<GeneralFormValues>({
    initialValues: DEFAULT_VALUES,
    validate: {
      name: (value) =>
        value.trim().length >= 2
          ? null
          : 'El nombre del local debe tener al menos 2 caracteres',
      email: (value) => {
        if (!value.trim()) {
          return null
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? null
          : 'Ingresá un correo válido'
      },
      openDays: (value) =>
        value.length > 0 ? null : 'Seleccioná al menos un día de apertura',
      slotMinutes: (value) => integerValue(value, 5, 120),
      expiryAlertDays: (value) => integerValue(value, 0, 365),
      vaccineAlertDays: (value) => integerValue(value, 0, 365),
      whatsappTemplate: (value) =>
        value.trim().length >= 10
          ? null
          : 'La plantilla debe tener al menos 10 caracteres'
    }
  })
  const { values, setFieldValue, setValues, resetDirty, onSubmit, errors } = form
  const settings = settingsQuery.data

  useEffect(() => {
    if (!settings) {
      return
    }

    setValues({
      name: settings.name,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      openDays: settings.openDays,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      slotMinutes: settings.slotMinutes,
      expiryAlertDays: settings.expiryAlertDays,
      vaccineAlertDays: settings.vaccineAlertDays,
      whatsappTemplate: settings.whatsappTemplate
    })
    resetDirty()
  }, [settings, setValues, resetDirty])

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (values.openTime >= values.closeTime) {
      form.setFieldError(
        'closeTime',
        'La hora de cierre debe ser posterior a la apertura'
      )
      return
    }

    void onSubmit(async (formValues) => {
      setSaving(true)

      try {
        const payload: UpdateSettingsInput = {
          name: formValues.name,
          address: formValues.address,
          phone: formValues.phone,
          email: formValues.email,
          currency: 'ARS',
          openDays: formValues.openDays as UpdateSettingsInput['openDays'],
          openTime: formValues.openTime,
          closeTime: formValues.closeTime,
          slotMinutes: Number(formValues.slotMinutes),
          expiryAlertDays: Number(formValues.expiryAlertDays),
          vaccineAlertDays: Number(formValues.vaccineAlertDays),
          whatsappTemplate: formValues.whatsappTemplate,
          backupEnabled: settings?.backupEnabled ?? true,
          backupFolder: settings?.backupFolder ?? '',
          backupRetention: settings?.backupRetention ?? 30
        }
        await api.settings.update(payload)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['settings'] }),
          refresh()
        ])
        notifications.show({
          color: 'vetGreen',
          title: 'Configuración guardada',
          message: 'Los datos del local y la agenda se actualizaron.'
        })
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar la configuración',
          message:
            error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setSaving(false)
      }
    })(event)
  }

  if (settingsQuery.isPending) {
    return (
      <Group justify="center" py="xl">
        <Loader color="vetGreen" />
      </Group>
    )
  }

  if (settingsQuery.isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={18} />}>
        {settingsQuery.error.message}
      </Alert>
    )
  }

  return (
    <Card withBorder padding="lg" radius="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <div>
            <Text fw={600}>Datos del local</Text>
            <Text size="xs" c="dimmed">
              Se muestran en la aplicación y en los mensajes de WhatsApp.
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Nombre del local"
              required
              value={values.name}
              onChange={(event) =>
                setFieldValue('name', event.currentTarget.value)
              }
              error={errors.name}
            />
            <TextInput
              label="Teléfono"
              placeholder="11 5555-1234"
              value={values.phone}
              onChange={(event) =>
                setFieldValue('phone', event.currentTarget.value)
              }
              error={errors.phone}
            />
            <TextInput
              label="Correo electrónico"
              type="email"
              value={values.email}
              onChange={(event) =>
                setFieldValue('email', event.currentTarget.value)
              }
              error={errors.email}
            />
            <TextInput
              label="Dirección"
              value={values.address}
              onChange={(event) =>
                setFieldValue('address', event.currentTarget.value)
              }
              error={errors.address}
            />
          </SimpleGrid>

          <Divider label="Horarios de peluquería" labelPosition="left" />

          <div>
            <Text size="sm" fw={500} mb={6}>
              Días de apertura
            </Text>
            <Chip.Group
              multiple
              value={values.openDays}
              onChange={(next) => setFieldValue('openDays', next)}
            >
              <Group gap="xs">
                {DAY_OPTIONS.map((day) => (
                  <Chip key={day.value} value={day.value} variant="light">
                    {day.label}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            {errors.openDays && (
              <Text size="xs" c="red" mt={4}>
                {errors.openDays}
              </Text>
            )}
          </div>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <TextInput
              type="time"
              label="Apertura"
              value={values.openTime}
              onChange={(event) =>
                setFieldValue('openTime', event.currentTarget.value)
              }
              error={errors.openTime}
            />
            <TextInput
              type="time"
              label="Cierre"
              value={values.closeTime}
              onChange={(event) =>
                setFieldValue('closeTime', event.currentTarget.value)
              }
              error={errors.closeTime}
            />
            <NumberInput
              label="Intervalo (min)"
              min={5}
              max={120}
              step={5}
              value={values.slotMinutes}
              onChange={(value) => setFieldValue('slotMinutes', value)}
              error={errors.slotMinutes}
            />
            <NumberInput
              label="Días de aviso vencimiento"
              min={0}
              max={365}
              value={values.expiryAlertDays}
              onChange={(value) => setFieldValue('expiryAlertDays', value)}
              error={errors.expiryAlertDays}
            />
            <NumberInput
              label="Días de aviso vacunas"
              min={0}
              max={365}
              value={values.vaccineAlertDays}
              onChange={(value) => setFieldValue('vaccineAlertDays', value)}
              error={errors.vaccineAlertDays}
            />
          </SimpleGrid>

          <Divider label="Mensajes de WhatsApp" labelPosition="left" />

          <Textarea
            label="Plantilla de recordatorio"
            description="Placeholders: {cliente}, {mascota}, {fecha}, {hora}, {servicios}, {negocio}."
            minRows={4}
            maxLength={500}
            value={values.whatsappTemplate}
            onChange={(event) =>
              setFieldValue('whatsappTemplate', event.currentTarget.value)
            }
            error={errors.whatsappTemplate}
          />

          <Group justify="flex-end">
            <Button
              type="submit"
              loading={saving}
              leftSection={<IconDeviceFloppy size={17} />}
            >
              Guardar configuración
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  )
}

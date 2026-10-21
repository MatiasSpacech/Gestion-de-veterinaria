import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  Autocomplete,
  Avatar,
  Button,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconPaw, IconPhoto, IconX } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PetRecord, PetSex } from '@shared/types'
import { api } from '@renderer/lib/api'
import { getPetPhotoUrl } from '@renderer/lib/pet-photo'

interface PetFormModalProps {
  opened: boolean
  onClose: () => void
  pet?: PetRecord | null
  fixedClientId?: number
  fixedClientName?: string
}

interface PetFormValues {
  clientId: string | null
  name: string
  species: string
  breed: string
  sex: PetSex
  birthDate: string
  color: string
  weightKg: number | string
  sterilized: boolean
  allergies: string
  chronicConditions: string
  notes: string
  photoFileName: string | null
}

const SPECIES_OPTIONS = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Roedor', 'Otro']

const SEX_OPTIONS: Array<{ value: PetSex; label: string }> = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'desconocido', label: 'Sin dato' }
]

export function PetFormModal({
  opened,
  onClose,
  pet,
  fixedClientId,
  fixedClientName
}: PetFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const form = useForm<PetFormValues>({
    initialValues: {
      clientId: fixedClientId ? String(fixedClientId) : null,
      name: '',
      species: 'Perro',
      breed: '',
      sex: 'desconocido',
      birthDate: '',
      color: '',
      weightKg: '',
      sterilized: false,
      allergies: '',
      chronicConditions: '',
      notes: '',
      photoFileName: null
    },
    validate: {
      clientId: (value) =>
        fixedClientId || value ? null : 'Seleccioná el cliente',
      name: (value) =>
        value.trim().length > 0 ? null : 'Ingresá el nombre de la mascota',
      species: (value) =>
        value.trim().length > 0 ? null : 'Ingresá la especie',
      birthDate: (value) =>
        !value || /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? null
          : 'Ingresá una fecha válida',
      weightKg: (value) => {
        if (value === '' || value === null || value === undefined) {
          return null
        }

        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue >= 0
          ? null
          : 'Ingresá un peso válido'
      }
    }
  })

  const { reset, resetDirty, setValues } = form

  const clientsQuery = useQuery({
    queryKey: ['clients', 'pet-options'],
    queryFn: () => api.clients.list({ search: '', includeInactive: true }),
    enabled: opened && !fixedClientId
  })

  const clientOptions = useMemo(
    () =>
      (clientsQuery.data ?? []).map((client) => ({
        value: String(client.id),
        label: client.active ? client.name : `${client.name} (inactivo)`,
        disabled: !client.active && client.id !== pet?.clientId
      })),
    [clientsQuery.data, pet?.clientId]
  )

  useEffect(() => {
    if (!opened) {
      return
    }

    if (pet) {
      setValues({
        clientId: String(pet.clientId),
        name: pet.name,
        species: pet.species,
        breed: pet.breed ?? '',
        sex: pet.sex,
        birthDate: pet.birthDate ?? '',
        color: pet.color ?? '',
        weightKg: pet.weightKg ?? '',
        sterilized: pet.sterilized,
        allergies: pet.allergies ?? '',
        chronicConditions: pet.chronicConditions ?? '',
        notes: pet.notes ?? '',
        photoFileName: pet.photoFileName
      })
    } else {
      setValues({
        clientId: fixedClientId ? String(fixedClientId) : null,
        name: '',
        species: 'Perro',
        breed: '',
        sex: 'desconocido',
        birthDate: '',
        color: '',
        weightKg: '',
        sterilized: false,
        allergies: '',
        chronicConditions: '',
        notes: '',
        photoFileName: null
      })
    }

    resetDirty()
  }, [opened, pet, fixedClientId, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handlePickPhoto = async (): Promise<void> => {
    setPhotoLoading(true)

    try {
      const selection = await api.pets.pickPhoto()

      if (selection) {
        form.setFieldValue('photoFileName', selection.fileName)
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo cargar la foto',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    } finally {
      setPhotoLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      const clientId = fixedClientId ?? Number(values.clientId)

      if (!clientId) {
        form.setFieldError('clientId', 'Seleccioná el cliente')
        return
      }

      const weightKg =
        values.weightKg === '' || values.weightKg === null
          ? null
          : Number(values.weightKg)

      const payload = {
        clientId,
        name: values.name,
        species: values.species,
        breed: values.breed,
        sex: values.sex,
        birthDate: values.birthDate || null,
        color: values.color,
        weightKg,
        sterilized: values.sterilized,
        allergies: values.allergies,
        chronicConditions: values.chronicConditions,
        notes: values.notes,
        photoFileName: values.photoFileName
      }

      setLoading(true)

      try {
        if (pet) {
          await api.pets.update({ id: pet.id, ...payload })
        } else {
          await api.pets.create(payload)
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['pets'] }),
          queryClient.invalidateQueries({ queryKey: ['pet'] }),
          queryClient.invalidateQueries({ queryKey: ['client'] }),
          queryClient.invalidateQueries({ queryKey: ['clients'] }),
          queryClient.invalidateQueries({ queryKey: ['upcoming-vaccines'] })
        ])

        notifications.show({
          color: 'vetGreen',
          title: pet ? 'Mascota actualizada' : 'Mascota registrada',
          message: pet
            ? 'La ficha de la mascota se actualizó correctamente.'
            : 'La mascota ya forma parte del historial del cliente.'
        })

        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar la mascota',
          message: error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setLoading(false)
      }
    })(event)
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={pet ? 'Editar mascota' : 'Nueva mascota'}
      size="lg"
      centered
      closeOnClickOutside={!loading}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {!fixedClientId && clientsQuery.data?.length === 0 ? (
            <Alert color="orange" icon={<IconAlertCircle size={18} />}>
              Primero creá un cliente para poder registrar una mascota.
            </Alert>
          ) : null}

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {fixedClientId ? (
              <TextInput
                label="Tutor"
                value={fixedClientName ?? pet?.clientName ?? ''}
                readOnly
              />
            ) : (
              <Select
                label="Tutor"
                placeholder="Buscar cliente"
                searchable
                data={clientOptions}
                disabled={clientsQuery.isPending}
                {...form.getInputProps('clientId')}
              />
            )}
            <TextInput
              label="Nombre"
              placeholder="Nombre de la mascota"
              data-autofocus
              {...form.getInputProps('name')}
            />
            <Autocomplete
              label="Especie"
              data={SPECIES_OPTIONS}
              {...form.getInputProps('species')}
            />
            <TextInput
              label="Raza"
              placeholder="Opcional"
              {...form.getInputProps('breed')}
            />
            <Select
              label="Sexo"
              data={SEX_OPTIONS}
              {...form.getInputProps('sex')}
            />
            <TextInput
              label="Fecha de nacimiento"
              type="date"
              {...form.getInputProps('birthDate')}
            />
            <TextInput
              label="Color"
              placeholder="Opcional"
              {...form.getInputProps('color')}
            />
            <NumberInput
              label="Peso actual (kg)"
              placeholder="Ej. 12,5"
              min={0}
              max={500}
              decimalScale={2}
              step={0.1}
              {...form.getInputProps('weightKg')}
            />
          </SimpleGrid>

          <Switch
            label="Esterilizado/a"
            {...form.getInputProps('sterilized', { type: 'checkbox' })}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Textarea
              label="Alergias"
              placeholder="Medicamentos, alimentos u otras"
              minRows={2}
              autosize
              {...form.getInputProps('allergies')}
            />
            <Textarea
              label="Condiciones crónicas"
              placeholder="Enfermedades o cuidados permanentes"
              minRows={2}
              autosize
              {...form.getInputProps('chronicConditions')}
            />
          </SimpleGrid>

          <Textarea
            label="Notas"
            placeholder="Observaciones generales"
            minRows={2}
            autosize
            {...form.getInputProps('notes')}
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Foto
            </Text>
            <Group gap="md">
              <Avatar
                src={getPetPhotoUrl(form.values.photoFileName)}
                size={88}
                radius="lg"
                color="vetGreen"
              >
                <IconPaw size={34} stroke={1.5} />
              </Avatar>
              <Stack gap="xs">
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconPhoto size={15} />}
                    loading={photoLoading}
                    onClick={() => void handlePickPhoto()}
                  >
                    Elegir foto
                  </Button>
                  {form.values.photoFileName ? (
                    <Button
                      variant="subtle"
                      color="gray"
                      size="xs"
                      leftSection={<IconX size={15} />}
                      onClick={() => form.setFieldValue('photoFileName', null)}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </Group>
                <Text size="xs" c="dimmed">
                  JPG, PNG o WEBP. Máximo 10 MB.
                </Text>
              </Stack>
            </Group>
          </Stack>

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {pet ? 'Guardar cambios' : 'Registrar mascota'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}

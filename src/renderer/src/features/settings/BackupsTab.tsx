import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconFolder,
  IconFolderOpen,
  IconHistory,
  IconRestore
} from '@tabler/icons-react'
import type { UpdateSettingsInput } from '@shared/schemas'
import type { BackupRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatDateTime } from '@renderer/lib/format'
import { formatFileSize } from './settings-constants'

export function BackupsTab(): React.JSX.Element {
  const queryClient = useQueryClient()
  const modals = useModals()
  const [draft, setDraft] = useState<{
    enabled?: boolean
    folder?: string
    retention?: number | string
  }>({})
  const [saving, setSaving] = useState(false)
  const [pickingFolder, setPickingFolder] = useState(false)
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get
  })
  const backupsQuery = useQuery({
    queryKey: ['backups'],
    queryFn: api.backups.list
  })
  const settings = settingsQuery.data
  const enabled = draft.enabled ?? settings?.backupEnabled ?? true
  const folder = draft.folder ?? settings?.backupFolder ?? ''
  const retention =
    draft.retention ?? (settings?.backupRetention as number | string) ?? 30
  const createBackup = useMutation({
    mutationFn: api.backups.create,
    onSuccess: async (backup) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['backups'] }),
        queryClient.invalidateQueries({ queryKey: ['settings'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Backup creado',
        message: backup.fileName
      })
    },
    onError: (error: Error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo crear el backup',
        message: error.message
      })
    }
  })
  const restoreBackup = useMutation({
    mutationFn: (backup: BackupRecord) =>
      api.backups.restore({ fileName: backup.fileName }),
    onSuccess: () => {
      notifications.show({
        color: 'blue',
        title: 'Backup restaurado',
        message: 'La aplicación se reiniciará para cargar los datos restaurados.',
        autoClose: false
      })
    },
    onError: (error: Error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo restaurar el backup',
        message: error.message
      })
    }
  })

  const saveSettings = async (): Promise<void> => {
    if (!settings) {
      return
    }

    const retentionNumber = Number(retention)

    if (
      !Number.isInteger(retentionNumber) ||
      retentionNumber < 1 ||
      retentionNumber > 365
    ) {
      notifications.show({
        color: 'orange',
        title: 'Retención inválida',
        message: 'Ingresá una cantidad entre 1 y 365 backups.',
        autoClose: 3000
      })
      return
    }

    setSaving(true)

    try {
      const payload: UpdateSettingsInput = {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        currency: 'ARS',
        openDays: settings.openDays as UpdateSettingsInput['openDays'],
        openTime: settings.openTime,
        closeTime: settings.closeTime,
        slotMinutes: settings.slotMinutes,
        expiryAlertDays: settings.expiryAlertDays,
        vaccineAlertDays: settings.vaccineAlertDays,
        whatsappTemplate: settings.whatsappTemplate,
        backupEnabled: enabled,
        backupFolder: folder,
        backupRetention: retentionNumber
      }
      await api.settings.update(payload)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
        queryClient.invalidateQueries({ queryKey: ['backups'] })
      ])
      setDraft({})
      notifications.show({
        color: 'vetGreen',
        title: 'Configuración de backups guardada',
        message: 'Los cambios se aplicarán en el próximo inicio de la aplicación.'
      })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo guardar',
        message:
          error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    } finally {
      setSaving(false)
    }
  }

  const chooseFolder = async (): Promise<void> => {
    setPickingFolder(true)

    try {
      const selected = await api.settings.pickBackupFolder()

      if (selected) {
        setDraft((current) => ({ ...current, folder: selected }))
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo elegir la carpeta',
        message:
          error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    } finally {
      setPickingFolder(false)
    }
  }

  const openFolder = async (): Promise<void> => {
    try {
      await api.settings.openBackupFolder()
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo abrir la carpeta',
        message:
          error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  }

  const confirmRestore = (backup: BackupRecord): void => {
    modals.openConfirmModal({
      title: 'Restaurar backup',
      children: (
        <Stack gap="sm">
          <Text size="sm">
            Se reemplazarán todos los datos actuales por los del backup{' '}
            <Text span fw={600}>
              {backup.fileName}
            </Text>
            .
          </Text>
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
            Antes de restaurar se creará un backup de seguridad. La aplicación
            se reiniciará automáticamente.
          </Alert>
        </Stack>
      ),
      labels: { confirm: 'Restaurar y reiniciar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => restoreBackup.mutate(backup)
    })
  }

  if (settingsQuery.isPending || backupsQuery.isPending) {
    return (
      <Group justify="center" py="xl">
        <Loader color="vetGreen" />
      </Group>
    )
  }

  if (settingsQuery.isError || backupsQuery.isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={18} />}>
        {settingsQuery.error?.message ?? backupsQuery.error?.message}
      </Alert>
    )
  }

  const backups = backupsQuery.data ?? []

  return (
    <Stack gap="md">
      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={600}>Copias automáticas</Text>
              <Text size="xs" c="dimmed">
                Se crea una copia diaria al iniciar la aplicación.
              </Text>
            </div>
            <Switch
              checked={enabled}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  enabled: event.currentTarget.checked
                }))
              }
              label="Activar"
            />
          </Group>
          <Group align="flex-end" gap="sm" wrap="wrap">
            <TextInput
              label="Carpeta de backups"
              description="Vacío = Documentos\VetGestión\Backups"
              value={folder}
              readOnly
              style={{ flex: 1, minWidth: 260 }}
            />
            <Button
              variant="light"
              leftSection={<IconFolder size={17} />}
              onClick={() => void chooseFolder()}
              loading={pickingFolder}
            >
              Elegir
            </Button>
            <Button
              variant="subtle"
              leftSection={<IconFolderOpen size={17} />}
              onClick={() => void openFolder()}
            >
              Abrir carpeta
            </Button>
          </Group>
          <Group align="flex-end" gap="sm">
            <NumberInput
              label="Backups a conservar"
              min={1}
              max={365}
              value={retention}
              onChange={(value) =>
                setDraft((current) => ({ ...current, retention: value }))
              }
              w={180}
            />
            <Button onClick={() => void saveSettings()} loading={saving}>
              Guardar
            </Button>
            <Button
              variant="light"
              color="vetGreen"
              leftSection={<IconDatabaseExport size={17} />}
              onClick={() => createBackup.mutate()}
              loading={createBackup.isPending}
            >
              Crear backup ahora
            </Button>
          </Group>
          <Group gap="xs">
            <IconHistory size={16} />
            <Text size="sm" c="dimmed">
              Último backup: {formatDateTime(settings?.lastBackupAt)}
            </Text>
          </Group>
        </Stack>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={600}>Backups disponibles</Text>
            <Text size="xs" c="dimmed">
              Los backups más antiguos se eliminan según la retención.
            </Text>
          </div>
          <Badge variant="light">{backups.length} archivos</Badge>
        </Group>

        {backups.length === 0 ? (
          <Text size="sm" c="dimmed">
            Todavía no hay backups en la carpeta configurada.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Archivo</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Tamaño</Table.Th>
                  <Table.Th ta="right">Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {backups.map((backup) => (
                  <Table.Tr key={backup.fileName}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon variant="light" size="sm">
                          <IconDatabaseExport size={14} />
                        </ThemeIcon>
                        <Text size="sm">{backup.fileName}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDateTime(backup.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatFileSize(backup.sizeBytes)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        leftSection={<IconRestore size={15} />}
                        onClick={() => confirmRestore(backup)}
                        loading={
                          restoreBackup.isPending &&
                          restoreBackup.variables?.fileName === backup.fileName
                        }
                      >
                        Restaurar
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  )
}

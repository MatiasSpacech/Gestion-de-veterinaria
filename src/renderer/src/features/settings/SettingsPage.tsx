import { Alert, Stack, Tabs, Text, Title } from '@mantine/core'
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconDatabase,
  IconHistory
} from '@tabler/icons-react'
import { useAuth } from '@renderer/lib/use-auth'
import { ActivityTab } from './ActivityTab'
import { BackupsTab } from './BackupsTab'
import { GeneralSettingsTab } from './GeneralSettingsTab'

export function SettingsPage(): React.JSX.Element {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return (
      <Stack gap="lg">
        <Title order={2}>Configuración</Title>
        <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
          Solo un administrador puede acceder a la configuración del sistema.
        </Alert>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Configuración</Title>
        <Text c="dimmed" size="sm">
          Datos del local, agenda, backups y auditoría del sistema.
        </Text>
      </div>

      <Tabs defaultValue="general" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconBuildingStore size={16} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="backups" leftSection={<IconDatabase size={16} />}>
            Backups
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
            Auditoría
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general" pt="md">
          <GeneralSettingsTab />
        </Tabs.Panel>
        <Tabs.Panel value="backups" pt="md">
          <BackupsTab />
        </Tabs.Panel>
        <Tabs.Panel value="activity" pt="md">
          <ActivityTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

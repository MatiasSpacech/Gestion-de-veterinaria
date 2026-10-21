import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core'
import { IconArrowLeft, IconTool } from '@tabler/icons-react'
import type { TablerIcon } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

interface PlaceholderPageProps {
  title: string
  description: string
  phase: string
  icon: TablerIcon
}

export function PlaceholderPage({
  title,
  description,
  phase,
  icon: Icon
}: PlaceholderPageProps): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <Stack gap="lg">
      <Card padding="xl" maw={680}>
        <Stack gap="lg" align="flex-start">
          <ThemeIcon size={56} radius="lg" variant="light" color="vetGreen">
            <Icon size={28} stroke={1.7} />
          </ThemeIcon>
          <div>
            <Group gap="sm" mb={6}>
              <Title order={2}>{title}</Title>
              <Badge variant="light" color="vetGreen">
                {phase}
              </Badge>
            </Group>
            <Text c="dimmed" maw={520}>
              {description}
            </Text>
          </div>
          <Group gap="sm">
            <Button
              variant="light"
              color="vetGreen"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
            >
              Volver al panel
            </Button>
            <Group gap={6} c="dimmed">
              <IconTool size={15} />
              <Text size="xs">Módulo en desarrollo</Text>
            </Group>
          </Group>
        </Stack>
      </Card>
    </Stack>
  )
}

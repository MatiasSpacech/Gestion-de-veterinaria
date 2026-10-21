import { useState, type FormEvent } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { useForm } from '@mantine/form'
import {
  IconAlertCircle,
  IconArrowRight,
  IconBoxSeam,
  IconPaw,
  IconScissors,
  IconVaccine,
  type TablerIcon
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@renderer/lib/use-auth'

const FEATURES: Array<{ icon: TablerIcon; title: string; description: string }> = [
  {
    icon: IconBoxSeam,
    title: 'Stock y lotes bajo control',
    description: 'Entradas, vencimientos y alertas de reposición.'
  },
  {
    icon: IconPaw,
    title: 'Historial de cada mascota',
    description: 'Consultas, vacunas y evolución de peso en un solo lugar.'
  },
  {
    icon: IconScissors,
    title: 'Peluquería organizada',
    description: 'Agenda por peluquero y turnos sin superposiciones.'
  },
  {
    icon: IconVaccine,
    title: 'Recordatorios a tiempo',
    description: 'Próximas dosis y vencimientos visibles desde el panel.'
  }
]

export function LoginPage(): React.JSX.Element {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    initialValues: {
      username: '',
      password: ''
    },
    validate: {
      username: (value) => (value.trim().length > 0 ? null : 'Ingresá tu usuario'),
      password: (value) => (value.length > 0 ? null : 'Ingresá tu contraseña')
    }
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setError(null)

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await login(values)
        navigate('/', { replace: true })
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo iniciar sesión'
        )
      } finally {
        setLoading(false)
      }
    })(event)
  }

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="auth-brand-content">
          <Badge variant="white" color="vetGreen" size="lg" radius="sm">
            Gestión veterinaria integral
          </Badge>
          <Title order={1} mt="xl" fz={{ base: 36, md: 46 }} lh={1.12} maw={480}>
            Todo tu local veterinario, en orden.
          </Title>
          <Text mt="md" maw={460} fz="md" style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
            Ventas, stock, historias clínicas y turnos de peluquería desde una única
            aplicación de escritorio.
          </Text>

          <Stack gap="lg" mt={44}>
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div className="auth-feature" key={feature.title}>
                  <div className="auth-feature-icon">
                    <Icon size={19} stroke={1.8} />
                  </div>
                  <div>
                    <Text fw={700} size="sm">
                      {feature.title}
                    </Text>
                    <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                      {feature.description}
                    </Text>
                  </div>
                </div>
              )
            })}
          </Stack>
        </div>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-form-mobile-brand">
            <div className="app-logo">
              <IconPaw size={24} stroke={1.8} />
            </div>
            <div>
              <Text fw={800}>VetGestión</Text>
              <Text size="xs" c="dimmed">
                {status.businessName}
              </Text>
            </div>
          </div>

          <Card padding="xl" withBorder shadow="sm">
            <Stack gap="xs" mb="xl">
              <Title order={2}>Bienvenido</Title>
              <Text c="dimmed" size="sm">
                Ingresá con tu usuario para continuar.
              </Text>
            </Stack>

            {error ? (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={18} />}
                mb="lg"
              >
                {error}
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="Usuario"
                  placeholder="nombre.apellido"
                  autoComplete="username"
                  autoFocus
                  {...form.getInputProps('username')}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  {...form.getInputProps('password')}
                />
                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  mt="sm"
                  loading={loading}
                  rightSection={<IconArrowRight size={17} />}
                >
                  Ingresar
                </Button>
              </Stack>
            </form>

            <Text ta="center" size="xs" c="dimmed" mt="lg">
              Los datos se guardan únicamente en esta computadora.
            </Text>
          </Card>

          <Group justify="space-between" mt="lg" px="xs">
            <Text size="xs" c="dimmed">
              {status.businessName}
            </Text>
            <Text size="xs" c="dimmed">
              Versión {status.version}
            </Text>
          </Group>
        </div>
      </main>
    </div>
  )
}

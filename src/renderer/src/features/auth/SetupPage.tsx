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
  IconCheck,
  IconDatabase,
  IconPaw,
  IconShieldLock
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@renderer/lib/use-auth'

export function SetupPage(): React.JSX.Element {
  const { setup, status } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    initialValues: {
      name: '',
      username: '',
      password: '',
      confirmPassword: ''
    },
    validate: {
      name: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el nombre completo',
      username: (value) => {
        const normalized = value.trim()

        if (normalized.length < 3) {
          return 'El usuario debe tener al menos 3 caracteres'
        }

        if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
          return 'Solo se permiten letras, números, puntos y guiones'
        }

        return null
      },
      password: (value) =>
        value.length >= 8 ? null : 'Usá al menos 8 caracteres',
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Las contraseñas no coinciden'
    }
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setError(null)

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await setup(values)
        navigate('/', { replace: true })
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo crear el administrador'
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
            Primer inicio
          </Badge>
          <Title order={1} mt="xl" fz={{ base: 36, md: 46 }} lh={1.12} maw={500}>
            Empecemos por lo importante.
          </Title>
          <Text mt="md" maw={460} fz="md" style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
            Creá la cuenta de administrador que va a gestionar el local y los accesos
            del equipo.
          </Text>

          <Stack gap="lg" mt={44}>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <IconShieldLock size={19} stroke={1.8} />
              </div>
              <div>
                <Text fw={700} size="sm">
                  Acceso administrador
                </Text>
                <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                  Permisos completos para configurar el sistema.
                </Text>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <IconDatabase size={19} stroke={1.8} />
              </div>
              <div>
                <Text fw={700} size="sm">
                  Datos locales y privados
                </Text>
                <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                  La información queda guardada en esta computadora.
                </Text>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">
                <IconCheck size={19} stroke={1.8} />
              </div>
              <div>
                <Text fw={700} size="sm">
                  El resto se configura después
                </Text>
                <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                  Podés agregar empleados y ajustar permisos más adelante.
                </Text>
              </div>
            </div>
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
                Configuración inicial
              </Text>
            </div>
          </div>

          <Card padding="xl" withBorder shadow="sm">
            <Stack gap="xs" mb="xl">
              <Title order={2}>Cuenta de administrador</Title>
              <Text c="dimmed" size="sm">
                Este usuario tendrá acceso completo al sistema.
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
                  label="Nombre completo"
                  placeholder="Nombre y apellido"
                  autoFocus
                  {...form.getInputProps('name')}
                />
                <TextInput
                  label="Usuario"
                  placeholder="admin"
                  description="Se usará para iniciar sesión"
                  autoComplete="username"
                  {...form.getInputProps('username')}
                />
                <PasswordInput
                  label="Contraseña"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...form.getInputProps('password')}
                />
                <PasswordInput
                  label="Repetir contraseña"
                  placeholder="Confirmá la contraseña"
                  autoComplete="new-password"
                  {...form.getInputProps('confirmPassword')}
                />
                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  mt="sm"
                  loading={loading}
                  rightSection={<IconArrowRight size={17} />}
                >
                  Crear administrador y comenzar
                </Button>
              </Stack>
            </form>
          </Card>

          <Group justify="space-between" mt="lg" px="xs">
            <Text size="xs" c="dimmed">
              Configuración inicial
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

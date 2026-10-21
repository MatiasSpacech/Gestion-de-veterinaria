import { useState } from 'react'
import {
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Title,
  UnstyledButton
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconCalendarEvent,
  IconChevronDown,
  IconKey,
  IconLogout,
  IconPaw
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROLE_LABELS } from '@shared/roles'
import { useAuth } from '@renderer/lib/use-auth'
import { ALL_NAV_ITEMS, NAV_SECTIONS } from '@renderer/lib/navigation'
import { ChangePasswordModal } from '@renderer/features/auth/ChangePasswordModal'

export function AppLayout(): React.JSX.Element {
  const { user, status, businessName, hasPermission, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [opened, { toggle, close }] = useDisclosure(false)
  const [passwordModalOpened, setPasswordModalOpened] = useState(false)

  if (!user) {
    return <></>
  }

  const currentTitle =
    ALL_NAV_ITEMS.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    )?.label ?? 'VetGestión'

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const dateLabel = dayjs().locale('es').format('ddd D [de] MMM')

  const handleLogout = async (): Promise<void> => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo cerrar sesión',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  }

  return (
    <>
      <AppShell
        header={{ height: 68 }}
        navbar={{
          width: 268,
          breakpoint: 'sm',
          collapsed: { mobile: !opened }
        }}
        padding="lg"
      >
        <AppShell.Header
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #e6eeea'
          }}
        >
          <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Box>
                <Title order={3} fz="lg" lh={1.2}>
                  {currentTitle}
                </Title>
                <Text size="xs" c="dimmed">
                  {businessName}
                </Text>
              </Box>
            </Group>

            <Group gap="md" wrap="nowrap">
              <Group gap={6} visibleFrom="md">
                <IconCalendarEvent size={15} color="var(--mantine-color-gray-6)" />
                <Text size="sm" c="dimmed">
                  {dateLabel}
                </Text>
              </Group>

              <Badge
                visibleFrom="lg"
                variant="light"
                color="vetGreen"
                radius="sm"
                tt="none"
              >
                {ROLE_LABELS[user.role]}
              </Badge>

              <Menu shadow="md" width={240} position="bottom-end">
                <Menu.Target>
                  <UnstyledButton
                    style={{
                      padding: '6px 8px',
                      borderRadius: 10,
                      transition: 'background 120ms ease'
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color="vetGreen" radius="xl" size="md">
                        {initials}
                      </Avatar>
                      <Box visibleFrom="sm">
                        <Text size="sm" fw={600} lh={1.2}>
                          {user.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {ROLE_LABELS[user.role]}
                        </Text>
                      </Box>
                      <Box visibleFrom="sm">
                        <IconChevronDown
                          size={14}
                          color="var(--mantine-color-gray-6)"
                        />
                      </Box>
                    </Group>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>
                    {user.username} · {ROLE_LABELS[user.role]}
                  </Menu.Label>
                  <Menu.Item
                    leftSection={<IconKey size={16} />}
                    onClick={() => setPasswordModalOpened(true)}
                  >
                    Cambiar contraseña
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    onClick={() => void handleLogout()}
                  >
                    Cerrar sesión
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar
          p="md"
          style={{
            background: '#fff',
            borderRight: '1px solid #e6eeea'
          }}
        >
          <UnstyledButton
            onClick={() => navigate('/')}
            mb="sm"
            style={{ display: 'block', width: '100%' }}
          >
            <Group gap="sm" wrap="nowrap">
              <div className="app-logo">
                <IconPaw size={23} stroke={1.8} />
              </div>
              <div>
                <Text fw={800} lh={1.2}>
                  VetGestión
                </Text>
                <Text size="xs" c="dimmed">
                  {businessName}
                </Text>
              </div>
            </Group>
          </UnstyledButton>

          <ScrollArea style={{ flex: 1 }} type="never" offsetScrollbars={false}>
            <Stack gap={0}>
              {NAV_SECTIONS.map((section) => {
                const items = section.items.filter((item) => hasPermission(item.module))

                if (items.length === 0) {
                  return null
                }

                return (
                  <Box key={section.title}>
                    <Text className="nav-section-title">{section.title}</Text>
                    {items.map((item) => {
                      const Icon = item.icon
                      const active =
                        item.path === '/'
                          ? location.pathname === '/'
                          : location.pathname.startsWith(item.path)

                      return (
                        <NavLink
                          key={item.path}
                          active={active}
                          label={item.label}
                          leftSection={<Icon size={19} stroke={1.7} />}
                          color="vetGreen"
                          variant="light"
                          onClick={() => {
                            navigate(item.path)
                            close()
                          }}
                          styles={{
                            root: {
                              borderRadius: 9,
                              marginBottom: 3,
                              paddingTop: 8,
                              paddingBottom: 8
                            },
                            label: {
                              fontSize: 13.5,
                              fontWeight: 500
                            }
                          }}
                        />
                      )
                    })}
                  </Box>
                )
              })}
            </Stack>
          </ScrollArea>

          <Text size="xs" c="dimmed" ta="center" mt="md">
            Versión {status.version}
          </Text>
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>

      <ChangePasswordModal
        opened={passwordModalOpened}
        onClose={() => setPasswordModalOpened(false)}
      />
    </>
  )
}

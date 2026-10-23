import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Button,
  Chip,
  Dialog,
  Portal,
  Switch,
  Text,
  useTheme
} from 'react-native-paper'
import type { CreateUserInput, UpdateUserInput } from '@shared/schemas'
import { ROLE_LABELS, ROLES, type Role } from '@shared/roles'
import type { UserRecord } from '@shared/types'

import { AppButton } from '../src/components/AppButton'
import { AppTextInput } from '../src/components/AppTextInput'
import { EmptyState } from '../src/components/EmptyState'
import { Screen } from '../src/components/Screen'
import { SectionCard } from '../src/components/SectionCard'
import { canAccess } from '../src/data/controllers/permissions'
import { toAppError } from '../src/data/controllers/validation'
import {
  editUser,
  listUserDirectory,
  registerUser,
  resetPassword
} from '../src/features/users/users-service'

export default function UsersScreen() {
  const theme = useTheme()
  const allowed = canAccess('usuarios')

  const [users, setUsers] = useState<UserRecord[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editorVisible, setEditorVisible] = useState(false)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('vendedor')
  const [active, setActive] = useState(true)

  const [resetVisible, setResetVisible] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const load = useCallback(() => {
    if (!allowed) {
      return
    }

    setUsers(listUserDirectory())
    setError(null)
  }, [allowed])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const openCreate = () => {
    setEditing(null)
    setName('')
    setUsername('')
    setPassword('')
    setRole('vendedor')
    setActive(true)
    setError(null)
    setEditorVisible(true)
  }

  const openEdit = (user: UserRecord) => {
    setEditing(user)
    setName(user.name)
    setUsername(user.username)
    setPassword('')
    setRole(user.role)
    setActive(user.active)
    setError(null)
    setEditorVisible(true)
  }

  const handleSave = () => {
    setError(null)
    setBusy(true)

    try {
      if (editing) {
        const input: UpdateUserInput = {
          id: editing.id,
          name,
          username,
          role,
          active
        }

        editUser(input)
        setMessage('Usuario actualizado')
      } else {
        const input: CreateUserInput = {
          name,
          username,
          password,
          role
        }

        registerUser(input)
        setMessage('Usuario creado')
      }

      setEditorVisible(false)
      load()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  const openReset = (user: UserRecord) => {
    setResetTarget(user)
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setResetVisible(true)
  }

  const handleReset = () => {
    if (!resetTarget) {
      return
    }

    setError(null)
    setBusy(true)

    try {
      resetPassword({
        id: resetTarget.id,
        newPassword,
        confirmPassword
      })

      setResetVisible(false)
      setMessage(`Contraseña de ${resetTarget.name} actualizada`)
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  if (!allowed) {
    return (
      <Screen showBack title="Usuarios">
        <EmptyState
          icon="lock-closed-outline"
          title="Sin permiso"
          description="Tu rol no tiene acceso a la administración de usuarios."
        />
      </Screen>
    )
  }

  return (
    <Screen
      showBack
      title="Usuarios y roles"
      subtitle="Altas, roles, estado y contraseñas del personal."
    >
      <AppButton icon="account-plus-outline" onPress={openCreate}>
        Nuevo usuario
      </AppButton>

      {message ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
          {message}
        </Text>
      ) : null}

      <SectionCard title="Usuarios" subtitle={`${users.length} cuentas`}>
        <View style={styles.list}>
          {users.map((user) => (
            <View key={user.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text variant="titleSmall" style={styles.title}>
                  {user.name}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {`${user.username} · ${ROLE_LABELS[user.role]}`}
                </Text>
                {user.active ? null : (
                  <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                    Desactivado
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                <Button compact icon="pencil-outline" onPress={() => openEdit(user)}>
                  Editar
                </Button>
                <Button compact icon="key-outline" onPress={() => openReset(user)}>
                  Clave
                </Button>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      <Portal>
        <Dialog visible={editorVisible} onDismiss={() => setEditorVisible(false)}>
          <Dialog.Title>
            {editing ? 'Editar usuario' : 'Nuevo usuario'}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <AppTextInput label="Nombre" onChangeText={setName} value={name} />
            <AppTextInput
              autoCapitalize="none"
              label="Usuario"
              onChangeText={setUsername}
              value={username}
            />
            {editing ? null : (
              <AppTextInput
                autoCapitalize="none"
                label="Contraseña"
                onChangeText={setPassword}
                secureTextEntry
                value={password}
              />
            )}

            <Text variant="labelLarge">Rol</Text>
            <View style={styles.chips}>
              {ROLES.map((option) => (
                <Chip
                  key={option}
                  onPress={() => setRole(option)}
                  selected={role === option}
                >
                  {ROLE_LABELS[option]}
                </Chip>
              ))}
            </View>

            {editing ? (
              <View style={styles.switchRow}>
                <Text variant="bodyMedium">Usuario activo</Text>
                <Switch onValueChange={setActive} value={active} />
              </View>
            ) : null}

            {error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {error}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditorVisible(false)}>Cancelar</Button>
            <Button loading={busy} onPress={handleSave}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={resetVisible} onDismiss={() => setResetVisible(false)}>
          <Dialog.Title>Cambiar contraseña</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium" style={styles.title}>
              {resetTarget?.name}
            </Text>
            <AppTextInput
              autoCapitalize="none"
              label="Nueva contraseña"
              onChangeText={setNewPassword}
              secureTextEntry
              value={newPassword}
            />
            <AppTextInput
              autoCapitalize="none"
              label="Confirmar contraseña"
              onChangeText={setConfirmPassword}
              secureTextEntry
              value={confirmPassword}
            />
            {error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {error}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetVisible(false)}>Cancelar</Button>
            <Button loading={busy} onPress={handleReset}>
              Actualizar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 12
  },
  row: {
    alignItems: 'center',
    borderTopColor: 'rgba(0,0,0,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  title: {
    fontWeight: '700'
  },
  actions: {
    alignItems: 'flex-end',
    gap: 2
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dialogContent: {
    gap: 12
  }
})

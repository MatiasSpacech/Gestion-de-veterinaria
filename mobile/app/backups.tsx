import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  Switch,
  Text,
  useTheme
} from 'react-native-paper'
import { formatDateTime } from '@renderer/lib/format'

import { AppButton } from '../src/components/AppButton'
import { EmptyState } from '../src/components/EmptyState'
import { Screen } from '../src/components/Screen'
import { toAppError } from '../src/data/controllers/validation'
import { useSession } from '../src/data/session-provider'
import { formatBytes } from '../src/lib/format'
import {
  createBackup,
  deleteBackup,
  listBackups,
  restoreBackup,
  type MobileBackup
} from '../src/data/backups'
import { getSetting, setSetting } from '@desktop/services/settings'
import { getMobileDatabase } from '../src/data/db'

export default function BackupsScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { user, signOut } = useSession()

  const [backups, setBackups] = useState<MobileBackup[]>([])
  const [automatic, setAutomatic] = useState(true)
  const [lastRun, setLastRun] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<MobileBackup | null>(null)

  const refresh = useCallback(() => {
    const db = getMobileDatabase()

    setBackups(listBackups())
    setAutomatic(getSetting(db, 'backup.enabled', '1') === '1')
    setLastRun(getSetting(db, 'backup.last_run', '') ?? '')
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreate = () => {
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      const backup = createBackup(user?.id ?? null)

      setMessage(`Backup creado: ${backup.fileName}`)
      refresh()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggleAutomatic = (value: boolean) => {
    setAutomatic(value)
    setSetting(getMobileDatabase(), 'backup.enabled', value ? '1' : '0')
  }

  const handleRestore = async (fileName: string) => {
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      await restoreBackup(fileName)

      setMessage(`Base restaurada desde ${fileName}`)
      refresh()
      signOut()
      router.replace('/login')
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
      setRestoreTarget(null)
    }
  }

  const handleDelete = (fileName: string) => {
    setError(null)
    setMessage(null)

    try {
      deleteBackup(fileName)
      refresh()
    } catch (caught) {
      setError(toAppError(caught).message)
    }
  }

  return (
    <Screen
      showBack
      title="Backups"
      subtitle="Copias de seguridad de la base local del dispositivo."
    >
      <Card mode="contained">
        <Card.Content style={styles.cardContent}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text variant="titleMedium" style={styles.title}>
                Backup automático diario
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {lastRun
                  ? `Último backup: ${formatDateTime(lastRun)}`
                  : 'Todavía no se hizo ningún backup'}
              </Text>
            </View>
            <Switch value={automatic} onValueChange={handleToggleAutomatic} />
          </View>

          <AppButton
            disabled={busy}
            icon="cloud-upload-outline"
            loading={busy}
            mode="contained"
            onPress={handleCreate}
          >
            Crear backup ahora
          </AppButton>
        </Card.Content>
      </Card>

      {message ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
          {message}
        </Text>
      ) : null}

      {error ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : null}

      {backups.length === 0 ? (
        <EmptyState
          icon="archive-outline"
          title="Todavía no hay backups"
          description="Creá uno manual o esperá al backup automático del día."
        />
      ) : (
        <Card mode="elevated">
          <Card.Content style={styles.list}>
            {backups.map((backup) => (
              <View key={backup.fileName} style={styles.backupRow}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {formatDateTime(backup.createdAt)}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {backup.fileName} · {formatBytes(backup.sizeBytes)}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <IconButton
                    disabled={busy}
                    icon="restore"
                    mode="contained-tonal"
                    onPress={() => setRestoreTarget(backup)}
                  />
                  <IconButton
                    icon="delete-outline"
                    iconColor={theme.colors.error}
                    onPress={() => handleDelete(backup.fileName)}
                  />
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <Portal>
        <Dialog
          visible={restoreTarget !== null}
          onDismiss={() => {
            if (!busy) {
              setRestoreTarget(null)
            }
          }}
        >
          <Dialog.Title>Restaurar backup</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium">
              Se reemplazarán todos los datos actuales por los del backup:
            </Text>
            <Text variant="titleSmall" style={styles.title}>
              {restoreTarget ? formatDateTime(restoreTarget.createdAt) : ''}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {restoreTarget?.fileName}
            </Text>
            <Text variant="bodySmall">
              Se creará un backup del estado actual antes de restaurar y se
              cerrará la sesión.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={busy}
              onPress={() => setRestoreTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              loading={busy}
              onPress={() => {
                if (restoreTarget) {
                  void handleRestore(restoreTarget.fileName)
                }
              }}
            >
              Restaurar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 14
  },
  dialogContent: {
    gap: 10
  },
  list: {
    gap: 12
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  title: {
    fontWeight: '700'
  },
  backupRow: {
    alignItems: 'center',
    borderTopColor: 'rgba(0,0,0,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12
  },
  actions: {
    flexDirection: 'row'
  }
})

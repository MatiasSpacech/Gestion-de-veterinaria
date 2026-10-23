import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Switch, Text, useTheme } from 'react-native-paper'

import { AppButton } from '../src/components/AppButton'
import { Screen } from '../src/components/Screen'
import { SectionCard } from '../src/components/SectionCard'
import {
  getBiometricCapability,
  type BiometricCapability
} from '../src/data/lock'
import { useSession } from '../src/data/session-provider'

export default function SecurityScreen() {
  const theme = useTheme()
  const {
    biometricEnabled,
    enableBiometricLock,
    disableBiometricLock,
    lockNow
  } = useSession()

  const [capability, setCapability] = useState<BiometricCapability | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useFocusEffect(
    useCallback(() => {
      void getBiometricCapability().then(setCapability)
    }, [])
  )

  const handleToggle = async (enabled: boolean) => {
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      if (enabled) {
        if (!capability?.available) {
          setError('Este dispositivo no tiene hardware biométrico disponible.')
          return
        }

        if (!capability.enrolled) {
          setError(
            'Primero registrá una huella o rostro en los ajustes de seguridad de Android.'
          )
          return
        }

        const success = await enableBiometricLock()

        if (!success) {
          setError('No se pudo verificar tu identidad. Intentá nuevamente.')
          return
        }

        setMessage('Bloqueo biométrico activado')
      } else {
        await disableBiometricLock()
        setMessage('Bloqueo biométrico desactivado')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      showBack
      title="Seguridad"
      subtitle="Protegé la sesión cuando la app queda en segundo plano."
    >
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

      <SectionCard title="Bloqueo biométrico">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text variant="bodyMedium">
              {capability?.label ?? 'Biometría'}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {capability === null
                ? 'Consultando el dispositivo...'
                : capability.available
                  ? capability.enrolled
                    ? 'Disponible y configurada'
                    : 'Disponible, sin datos registrados'
                  : 'No disponible en este dispositivo'}
            </Text>
          </View>
          <Switch
            disabled={busy || !capability?.available || !capability.enrolled}
            onValueChange={(value) => void handleToggle(value)}
            value={biometricEnabled}
          />
        </View>
      </SectionCard>

      <SectionCard title="Bloqueo automático">
        <Text variant="bodyMedium">
          Con el bloqueo activo, la app pide tu huella, rostro o contraseña cada
          vez que vuelve del segundo plano.
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Las cámaras, el selector de fotos y las hojas de compartir no disparan
          el bloqueo.
        </Text>
      </SectionCard>

      {biometricEnabled ? (
        <AppButton icon="lock-outline" mode="outlined" onPress={lockNow}>
          Bloquear ahora
        </AppButton>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  switchText: {
    flex: 1,
    gap: 2
  }
})

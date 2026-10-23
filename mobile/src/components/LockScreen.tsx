import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSession } from '../data/session-provider'
import { AppButton } from './AppButton'
import { AppTextInput } from './AppTextInput'

export function LockScreen() {
  const router = useRouter()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { user, signOut, unlockWithBiometrics, unlockWithPassword } = useSession()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const promptedRef = useRef(false)

  useEffect(() => {
    if (promptedRef.current) {
      return
    }

    promptedRef.current = true

    void unlockWithBiometrics()
  }, [unlockWithBiometrics])

  const handleBiometrics = async () => {
    setError(null)

    const success = await unlockWithBiometrics()

    if (!success) {
      setError('No se pudo verificar la biometría. Usá tu contraseña.')
    }
  }

  const handlePassword = () => {
    if (password === '') {
      setError('Ingresá tu contraseña')
      return
    }

    setError(null)
    setBusy(true)

    try {
      if (!unlockWithPassword(password)) {
        setError('La contraseña no es correcta')
        setPassword('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom
        }
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.primaryContainer }
        ]}
      >
        <Ionicons name="lock-closed" size={40} color={theme.colors.primary} />
      </View>

      <Text variant="headlineSmall" style={styles.title}>
        VetGestión bloqueado
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        {user ? `Hola ${user.name}, confirmá tu identidad para continuar.` : null}
      </Text>

      <View style={styles.form}>
        <AppButton icon="fingerprint" onPress={() => void handleBiometrics()}>
          Desbloquear con biometría
        </AppButton>

        <View style={styles.dividerRow}>
          <View
            style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]}
          />
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            o usá tu contraseña
          </Text>
          <View
            style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]}
          />
        </View>

        <AppTextInput
          autoCapitalize="none"
          label="Contraseña"
          onChangeText={setPassword}
          onSubmitEditing={handlePassword}
          secureTextEntry
          value={password}
        />

        {error ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        <AppButton
          disabled={busy}
          icon="lock-open-variant-outline"
          loading={busy}
          mode="outlined"
          onPress={handlePassword}
        >
          Desbloquear
        </AppButton>

        <AppButton
          icon="logout"
          mode="text"
          onPress={() => {
            signOut()
            router.replace('/login')
          }}
        >
          Cerrar sesión
        </AppButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    elevation: 20,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 100
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80
  },
  title: {
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center'
  },
  subtitle: {
    textAlign: 'center'
  },
  form: {
    gap: 12,
    marginTop: 12,
    maxWidth: 420,
    width: '100%'
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth
  }
})

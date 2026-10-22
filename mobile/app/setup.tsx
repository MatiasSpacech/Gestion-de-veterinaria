import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, TextInput, useTheme } from 'react-native-paper'
import { setupAdminSchema } from '@shared/schemas'

import { AppButton } from '../src/components/AppButton'
import { AppTextInput } from '../src/components/AppTextInput'
import { Screen } from '../src/components/Screen'
import { parseInput, toAppError } from '../src/data/controllers/validation'
import { useSession } from '../src/data/session-provider'

export default function SetupScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { createFirstAdmin } = useSession()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [hiddenPassword, setHiddenPassword] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = () => {
    setError(null)

    try {
      const input = parseInput(setupAdminSchema, {
        name,
        username,
        password,
        confirmPassword
      })

      setSubmitting(true)
      createFirstAdmin(input)
      router.replace('/')
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen
      title="Primer inicio"
      subtitle="Creá el usuario administrador de este dispositivo."
    >
      <View style={styles.brandRow}>
        <View
          style={[styles.brandMark, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="paw" size={28} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.brandText}>
          <Text variant="headlineSmall" style={styles.brandTitle}>
            VetGestión
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            La base local se crea en este dispositivo
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <AppTextInput
          label="Nombre"
          onChangeText={setName}
          placeholder="Administrador"
          value={name}
        />
        <AppTextInput
          autoCapitalize="none"
          autoCorrect={false}
          label="Usuario"
          onChangeText={setUsername}
          placeholder="admin"
          value={username}
        />
        <AppTextInput
          label="Contraseña"
          onChangeText={setPassword}
          right={
            <TextInput.Icon
              icon={hiddenPassword ? 'eye-outline' : 'eye-off-outline'}
              onPress={() => setHiddenPassword((hidden) => !hidden)}
            />
          }
          secureTextEntry={hiddenPassword}
          value={password}
        />
        <AppTextInput
          label="Repetir contraseña"
          onChangeText={setConfirmPassword}
          onSubmitEditing={handleSubmit}
          secureTextEntry={hiddenPassword}
          submitBehavior="blurAndSubmit"
          value={confirmPassword}
        />

        {error ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: theme.colors.errorContainer }
            ]}
          >
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onErrorContainer }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <AppButton
          disabled={submitting}
          icon="account-plus"
          loading={submitting}
          onPress={handleSubmit}
        >
          Crear administrador
        </AppButton>

        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          La contraseña se guarda con el mismo hash scrypt que usa la app de
          escritorio.
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  brandText: {
    flex: 1,
    gap: 2
  },
  brandTitle: {
    fontWeight: '800'
  },
  form: {
    gap: 14
  },
  errorBox: {
    borderRadius: 12,
    padding: 12
  }
})

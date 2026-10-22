import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, TextInput, useTheme } from 'react-native-paper'
import { loginSchema } from '@shared/schemas'

import { AppButton } from '../src/components/AppButton'
import { AppTextInput } from '../src/components/AppTextInput'
import { Screen } from '../src/components/Screen'
import { toAppError, parseInput } from '../src/data/controllers/validation'
import { useSession } from '../src/data/session-provider'

export default function LoginScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { signIn } = useSession()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hiddenPassword, setHiddenPassword] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = () => {
    setError(null)

    try {
      const input = parseInput(loginSchema, { username, password })

      setSubmitting(true)
      signIn(input)
      router.replace('/')
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen title="Ingresar" subtitle="Usá tu usuario del local para entrar.">
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
            Gestión veterinaria sin conexión
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <AppTextInput
          autoCapitalize="none"
          autoCorrect={false}
          label="Usuario"
          onChangeText={setUsername}
          placeholder="admin"
          returnKeyType="next"
          value={username}
        />
        <AppTextInput
          label="Contraseña"
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
          right={
            <TextInput.Icon
              icon={hiddenPassword ? 'eye-outline' : 'eye-off-outline'}
              onPress={() => setHiddenPassword((hidden) => !hidden)}
            />
          }
          secureTextEntry={hiddenPassword}
          submitBehavior="blurAndSubmit"
          value={password}
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
          icon="login"
          loading={submitting}
          onPress={handleSubmit}
        >
          Ingresar
        </AppButton>
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

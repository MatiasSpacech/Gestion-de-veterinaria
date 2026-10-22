import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'

import { AppButton } from '../../src/components/AppButton'
import { AppTextInput } from '../../src/components/AppTextInput'
import { Screen } from '../../src/components/Screen'
import { toAppError } from '../../src/data/controllers/validation'
import { createClientRecord } from '../../src/features/clients/clients-service'

export default function NewClientScreen() {
  const router = useRouter()
  const theme = useTheme()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = () => {
    setError(null)

    try {
      const client = createClientRecord({
        name,
        phone: phone.trim() === '' ? null : phone,
        email: email.trim() === '' ? null : email,
        docNumber: docNumber.trim() === '' ? null : docNumber,
        address: address.trim() === '' ? null : address,
        notes: notes.trim() === '' ? null : notes
      })

      router.replace(`/clientes/${client.id}`)
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen showBack title="Nuevo cliente" subtitle="Datos de contacto del cliente.">
      <View style={styles.form}>
        <AppTextInput
          label="Nombre y apellido"
          onChangeText={setName}
          value={name}
        />
        <AppTextInput
          keyboardType="phone-pad"
          label="Teléfono"
          onChangeText={setPhone}
          value={phone}
        />
        <AppTextInput
          autoCapitalize="none"
          keyboardType="email-address"
          label="Correo"
          onChangeText={setEmail}
          value={email}
        />
        <AppTextInput
          label="Documento"
          onChangeText={setDocNumber}
          value={docNumber}
        />
        <AppTextInput
          label="Dirección"
          onChangeText={setAddress}
          value={address}
        />
        <AppTextInput
          label="Notas"
          multiline
          numberOfLines={3}
          onChangeText={setNotes}
          value={notes}
        />

        {error ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        <AppButton
          disabled={busy}
          loading={busy}
          onPress={handleSubmit}
        >
          Guardar cliente
        </AppButton>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  form: {
    gap: 14
  }
})

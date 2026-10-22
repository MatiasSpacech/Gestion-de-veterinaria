import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Chip, Switch, Text, useTheme } from 'react-native-paper'
import type { PetSex } from '@shared/types'
import { AppError } from '@shared/errors'

import { AppButton } from '../../src/components/AppButton'
import { AppTextInput } from '../../src/components/AppTextInput'
import { Screen } from '../../src/components/Screen'
import { toAppError } from '../../src/data/controllers/validation'
import { createPetRecord } from '../../src/features/clients/clients-service'

const SEX_OPTIONS: readonly { value: PetSex; label: string }[] = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'desconocido', label: 'Sin dato' }
]

export default function NewPetScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { clientId } = useLocalSearchParams<{ clientId?: string }>()
  const parsedClientId = Number(clientId)

  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [breed, setBreed] = useState('')
  const [sex, setSex] = useState<PetSex>('desconocido')
  const [birthDate, setBirthDate] = useState('')
  const [color, setColor] = useState('')
  const [weight, setWeight] = useState('')
  const [sterilized, setSterilized] = useState(false)
  const [allergies, setAllergies] = useState('')
  const [chronicConditions, setChronicConditions] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = () => {
    setError(null)

    try {
      if (!Number.isFinite(parsedClientId) || parsedClientId <= 0) {
        throw new AppError('VALIDATION_ERROR', 'No se encontró el cliente')
      }

      const parsedWeight = weight.trim() === '' ? null : Number(weight)

      if (parsedWeight !== null && !Number.isFinite(parsedWeight)) {
        throw new AppError('VALIDATION_ERROR', 'El peso no es válido')
      }

      createPetRecord({
        clientId: parsedClientId,
        name,
        species,
        breed: breed.trim() === '' ? null : breed,
        sex,
        birthDate: birthDate.trim() === '' ? null : birthDate.trim(),
        color: color.trim() === '' ? null : color,
        weightKg: parsedWeight,
        sterilized,
        allergies: allergies.trim() === '' ? null : allergies,
        chronicConditions:
          chronicConditions.trim() === '' ? null : chronicConditions,
        notes: notes.trim() === '' ? null : notes,
        photoFileName: null
      })

      router.back()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      showBack
      title="Nueva mascota"
      subtitle="Ficha clínica de la mascota del cliente."
    >
      <View style={styles.form}>
        <AppTextInput label="Nombre" onChangeText={setName} value={name} />
        <AppTextInput
          label="Especie"
          onChangeText={setSpecies}
          placeholder="Perro, gato, conejo..."
          value={species}
        />
        <AppTextInput label="Raza" onChangeText={setBreed} value={breed} />

        <View style={styles.group}>
          <Text variant="labelLarge">Sexo</Text>
          <View style={styles.chips}>
            {SEX_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={sex === option.value}
                onPress={() => setSex(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </View>

        <AppTextInput
          label="Fecha de nacimiento"
          onChangeText={setBirthDate}
          placeholder="AAAA-MM-DD"
          value={birthDate}
        />
        <AppTextInput label="Color" onChangeText={setColor} value={color} />
        <AppTextInput
          keyboardType="numeric"
          label="Peso en kg"
          onChangeText={setWeight}
          value={weight}
        />

        <View style={styles.switchRow}>
          <Text variant="labelLarge">Castrado</Text>
          <Switch value={sterilized} onValueChange={setSterilized} />
        </View>

        <AppTextInput
          label="Alergias"
          multiline
          numberOfLines={2}
          onChangeText={setAllergies}
          value={allergies}
        />
        <AppTextInput
          label="Condiciones crónicas"
          multiline
          numberOfLines={2}
          onChangeText={setChronicConditions}
          value={chronicConditions}
        />
        <AppTextInput
          label="Notas"
          multiline
          numberOfLines={2}
          onChangeText={setNotes}
          value={notes}
        />

        {error ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        <AppButton disabled={busy} loading={busy} onPress={handleSubmit}>
          Guardar mascota
        </AppButton>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  form: {
    gap: 14
  },
  group: {
    gap: 8
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48
  }
})

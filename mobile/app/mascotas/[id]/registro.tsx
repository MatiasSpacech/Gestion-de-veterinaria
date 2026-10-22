import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Chip, Text, useTheme } from 'react-native-paper'
import type { MedicalRecordType } from '@shared/types'
import { AppError } from '@shared/errors'

import { AppButton } from '../../../src/components/AppButton'
import { AppTextInput } from '../../../src/components/AppTextInput'
import { Screen } from '../../../src/components/Screen'
import { toAppError } from '../../../src/data/controllers/validation'
import { createMedicalRecordEntry } from '../../../src/features/clients/clients-service'
import { localDateKey } from '../../../src/features/dashboard/dashboard-service'

const TYPE_OPTIONS: readonly { value: MedicalRecordType; label: string }[] = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'vacuna', label: 'Vacuna' },
  { value: 'desparasitacion', label: 'Desparasitación' },
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'tratamiento', label: 'Tratamiento' },
  { value: 'nota', label: 'Nota' },
  { value: 'peso', label: 'Peso' }
]

export default function NewMedicalRecordScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const petId = Number(id)

  const [type, setType] = useState<MedicalRecordType>('consulta')
  const [date, setDate] = useState(localDateKey())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [vetName, setVetName] = useState('')
  const [weight, setWeight] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = () => {
    setError(null)

    try {
      if (!Number.isFinite(petId) || petId <= 0) {
        throw new AppError('VALIDATION_ERROR', 'No se encontró la mascota')
      }

      const parsedWeight = weight.trim() === '' ? null : Number(weight)

      if (parsedWeight !== null && !Number.isFinite(parsedWeight)) {
        throw new AppError('VALIDATION_ERROR', 'El peso no es válido')
      }

      createMedicalRecordEntry({
        petId,
        type,
        date: date.trim(),
        title,
        description: description.trim() === '' ? null : description,
        diagnosis: diagnosis.trim() === '' ? null : diagnosis,
        treatment: treatment.trim() === '' ? null : treatment,
        vetName: vetName.trim() === '' ? null : vetName,
        weightKg: parsedWeight,
        nextDueDate: nextDueDate.trim() === '' ? null : nextDueDate.trim()
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
      title="Nuevo registro"
      subtitle="Consulta, vacuna o nota del historial clínico."
    >
      <View style={styles.form}>
        <View style={styles.group}>
          <Text variant="labelLarge">Tipo</Text>
          <View style={styles.chips}>
            {TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={type === option.value}
                onPress={() => setType(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </View>

        <AppTextInput
          label="Fecha"
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          value={date}
        />
        <AppTextInput
          label="Título"
          onChangeText={setTitle}
          value={title}
        />
        <AppTextInput
          label="Descripción"
          multiline
          numberOfLines={3}
          onChangeText={setDescription}
          value={description}
        />
        <AppTextInput
          label="Diagnóstico"
          multiline
          numberOfLines={2}
          onChangeText={setDiagnosis}
          value={diagnosis}
        />
        <AppTextInput
          label="Tratamiento"
          multiline
          numberOfLines={2}
          onChangeText={setTreatment}
          value={treatment}
        />
        <AppTextInput
          label="Veterinario"
          onChangeText={setVetName}
          value={vetName}
        />
        <AppTextInput
          keyboardType="numeric"
          label={type === 'peso' ? 'Peso en kg (obligatorio)' : 'Peso en kg'}
          onChangeText={setWeight}
          value={weight}
        />
        {type === 'vacuna' ? (
          <AppTextInput
            label="Próxima dosis (obligatoria)"
            onChangeText={setNextDueDate}
            placeholder="AAAA-MM-DD"
            value={nextDueDate}
          />
        ) : null}

        {error ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            {error}
          </Text>
        ) : null}

        <AppButton disabled={busy} loading={busy} onPress={handleSubmit}>
          Guardar registro
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
  }
})

import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Button,
  Chip,
  Switch,
  Text,
  useTheme
} from 'react-native-paper'
import { AppError } from '@shared/errors'
import type { UpdateSettingsInput } from '@shared/schemas'

import { AppButton } from '../src/components/AppButton'
import { AppTextInput } from '../src/components/AppTextInput'
import { EmptyState } from '../src/components/EmptyState'
import { Screen } from '../src/components/Screen'
import { SectionCard } from '../src/components/SectionCard'
import { canAccess } from '../src/data/controllers/permissions'
import { toAppError } from '../src/data/controllers/validation'
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendTestNotification
} from '../src/data/notifications'
import {
  getAppointmentRemindersEnabled,
  getBusinessSettings,
  saveBusinessSettings,
  setAppointmentRemindersEnabled
} from '../src/features/settings/settings-service'

const OPEN_DAYS = [
  { value: '1', label: 'Lun' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Mié' },
  { value: '4', label: 'Jue' },
  { value: '5', label: 'Vie' },
  { value: '6', label: 'Sáb' },
  { value: '7', label: 'Dom' }
] as const

type OpenDay = (typeof OPEN_DAYS)[number]['value']

type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable'

export default function SettingsScreen() {
  const theme = useTheme()
  const allowed = canAccess('configuracion')

  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [openDays, setOpenDays] = useState<OpenDay[]>([])
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('19:00')
  const [slotMinutes, setSlotMinutes] = useState('30')
  const [expiryAlertDays, setExpiryAlertDays] = useState('60')
  const [vaccineAlertDays, setVaccineAlertDays] = useState('30')
  const [whatsappTemplate, setWhatsappTemplate] = useState('')
  const [backupEnabled, setBackupEnabled] = useState(true)
  const [backupFolder, setBackupFolder] = useState('')
  const [backupRetention, setBackupRetention] = useState('30')

  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [permission, setPermission] =
    useState<PermissionStatus>('undetermined')

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (!allowed) {
      return
    }

    const settings = getBusinessSettings()

    setName(settings.name)
    setAddress(settings.address)
    setPhone(settings.phone)
    setEmail(settings.email)
    setOpenDays(settings.openDays.filter(isOpenDay))
    setOpenTime(settings.openTime)
    setCloseTime(settings.closeTime)
    setSlotMinutes(String(settings.slotMinutes))
    setExpiryAlertDays(String(settings.expiryAlertDays))
    setVaccineAlertDays(String(settings.vaccineAlertDays))
    setWhatsappTemplate(settings.whatsappTemplate)
    setBackupEnabled(settings.backupEnabled)
    setBackupFolder(settings.backupFolder)
    setBackupRetention(String(settings.backupRetention))
    setRemindersEnabled(getAppointmentRemindersEnabled())
    setLoaded(true)

    void getNotificationPermissionStatus().then(setPermission)
  }, [allowed])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const toggleDay = (day: OpenDay) => {
    setOpenDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day]
    )
  }

  const handleSave = () => {
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      const input: UpdateSettingsInput = {
        name,
        address,
        phone,
        email,
        currency: 'ARS',
        openDays,
        openTime,
        closeTime,
        slotMinutes: toInteger(slotMinutes, 'El intervalo de turnos'),
        expiryAlertDays: toInteger(
          expiryAlertDays,
          'Los días de alerta de vencimiento'
        ),
        vaccineAlertDays: toInteger(
          vaccineAlertDays,
          'Los días de alerta de vacunas'
        ),
        whatsappTemplate,
        backupEnabled,
        backupFolder,
        backupRetention: toInteger(backupRetention, 'La retención de backups')
      }

      saveBusinessSettings(input)
      setMessage('Configuración guardada')
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  const handleToggleReminders = async (enabled: boolean) => {
    setError(null)
    setMessage(null)

    if (!enabled) {
      setAppointmentRemindersEnabled(false)
      setRemindersEnabled(false)
      setMessage('Recordatorios desactivados')
      return
    }

    const granted = await requestNotificationPermission()
    const status = await getNotificationPermissionStatus()

    setPermission(status)

    if (!granted) {
      setAppointmentRemindersEnabled(false)
      setRemindersEnabled(false)
      setError(
        'El dispositivo no autorizó las notificaciones. Podés habilitarlas desde los ajustes de Android.'
      )
      return
    }

    setAppointmentRemindersEnabled(true)
    setRemindersEnabled(true)
    setMessage('Recordatorios de turnos activados')
  }

  const handleTestNotification = async () => {
    setError(null)
    const sent = await sendTestNotification(name)

    if (!sent) {
      setError('No se pudo enviar la notificación de prueba')
      return
    }

    setMessage('Notificación de prueba enviada')
  }

  if (!allowed) {
    return (
      <Screen showBack title="Configuración">
        <EmptyState
          icon="lock-closed-outline"
          title="Sin permiso"
          description="Tu rol no tiene acceso a la configuración del negocio."
        />
      </Screen>
    )
  }

  if (!loaded) {
    return (
      <Screen showBack title="Configuración">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Cargando la configuración...
        </Text>
      </Screen>
    )
  }

  return (
    <Screen
      showBack
      title="Configuración"
      subtitle="Datos del local, agenda, alertas y respaldos."
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

      <SectionCard title="Negocio" subtitle="Aparece en reportes y mensajes">
        <AppTextInput label="Nombre del local" onChangeText={setName} value={name} />
        <AppTextInput label="Dirección" onChangeText={setAddress} value={address} />
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
      </SectionCard>

      <SectionCard title="Agenda" subtitle="Días y horarios de atención">
        <Text variant="labelLarge">Días de apertura</Text>
        <View style={styles.chips}>
          {OPEN_DAYS.map((day) => (
            <Chip
              key={day.value}
              onPress={() => toggleDay(day.value)}
              selected={openDays.includes(day.value)}
            >
              {day.label}
            </Chip>
          ))}
        </View>
        <View style={styles.twoColumns}>
          <AppTextInput
            label="Apertura"
            onChangeText={setOpenTime}
            placeholder="HH:MM"
            style={styles.column}
            value={openTime}
          />
          <AppTextInput
            label="Cierre"
            onChangeText={setCloseTime}
            placeholder="HH:MM"
            style={styles.column}
            value={closeTime}
          />
        </View>
        <AppTextInput
          keyboardType="numeric"
          label="Intervalo de turnos (minutos)"
          onChangeText={setSlotMinutes}
          value={slotMinutes}
        />
      </SectionCard>

      <SectionCard title="Alertas" subtitle="Días de anticipación">
        <AppTextInput
          keyboardType="numeric"
          label="Vencimiento de productos"
          onChangeText={setExpiryAlertDays}
          value={expiryAlertDays}
        />
        <AppTextInput
          keyboardType="numeric"
          label="Próximas vacunas"
          onChangeText={setVaccineAlertDays}
          value={vaccineAlertDays}
        />
      </SectionCard>

      <SectionCard title="WhatsApp" subtitle="Plantilla de recordatorio de turnos">
        <AppTextInput
          label="Plantilla"
          multiline
          numberOfLines={4}
          onChangeText={setWhatsappTemplate}
          value={whatsappTemplate}
        />
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Variables disponibles: {'{cliente}'}, {'{mascota}'}, {'{servicio}'},{' '}
          {'{fecha}'}, {'{hora}'} y {'{negocio}'}.
        </Text>
      </SectionCard>

      <SectionCard
        title="Backups"
        subtitle="Las copias quedan en el almacenamiento privado de la app"
      >
        <View style={styles.switchRow}>
          <Text variant="bodyMedium">Backup automático diario</Text>
          <Switch onValueChange={setBackupEnabled} value={backupEnabled} />
        </View>
        <AppTextInput
          keyboardType="numeric"
          label="Copias a conservar"
          onChangeText={setBackupRetention}
          value={backupRetention}
        />
      </SectionCard>

      <SectionCard
        title="Notificaciones"
        subtitle="Recordatorio una hora antes de cada turno"
      >
        <View style={styles.switchRow}>
          <Text variant="bodyMedium">Recordatorios de turnos</Text>
          <Switch
            onValueChange={(value) => void handleToggleReminders(value)}
            value={remindersEnabled}
          />
        </View>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {permission === 'granted'
            ? 'El dispositivo autorizó las notificaciones.'
            : 'El dispositivo todavía no autorizó las notificaciones.'}
        </Text>
        <Button
          icon="bell-ring-outline"
          mode="outlined"
          onPress={() => void handleTestNotification()}
        >
          Enviar notificación de prueba
        </Button>
      </SectionCard>

      <AppButton disabled={busy} loading={busy} onPress={handleSave}>
        Guardar configuración
      </AppButton>
    </Screen>
  )
}

function isOpenDay(value: string): value is OpenDay {
  return /^[1-7]$/.test(value)
}

function toInteger(value: string, label: string): number {
  const parsed = Number(value)

  if (value.trim() === '' || !Number.isInteger(parsed)) {
    throw new AppError('VALIDATION_ERROR', `${label} debe ser un número entero`)
  }

  return parsed
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12
  },
  column: {
    flex: 1
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
})

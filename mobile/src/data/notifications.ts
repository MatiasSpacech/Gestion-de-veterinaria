import type * as ExpoNotifications from 'expo-notifications'
import type { AppointmentRecord } from '@shared/types'

import { getAppointmentRemindersEnabled } from '../features/settings/settings-service'
import {
  appointmentReminderDate,
  appointmentReminderIdentifier
} from './notifications-policy'

const CHANNEL_ID = 'turnos'
const CHANNEL_NAME = 'Recordatorios de turnos'

type NotificationsModule = typeof ExpoNotifications

let notificationsModule: Promise<NotificationsModule> | null = null
let handlerConfigured = false
let channelConfigured = false

function loadNotifications(): Promise<NotificationsModule> {
  notificationsModule ??= import('expo-notifications')
  return notificationsModule
}

async function configure(
  Notifications: NotificationsModule
): Promise<void> {
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    })

    handlerConfigured = true
  }

  if (!channelConfigured) {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: CHANNEL_NAME,
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#047857'
    })

    channelConfigured = true
  }
}

async function ensurePermission(
  Notifications: NotificationsModule
): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()

  if (current.granted) {
    return true
  }

  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

export async function configureNotifications(): Promise<void> {
  try {
    await configure(await loadNotifications())
  } catch {
    // El módulo nativo puede no estar disponible hasta compilar la app.
  }
}

export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unavailable'
> {
  try {
    const Notifications = await loadNotifications()
    const permission = await Notifications.getPermissionsAsync()

    if (permission.granted) {
      return 'granted'
    }

    return permission.status === 'undetermined' ? 'undetermined' : 'denied'
  } catch {
    return 'unavailable'
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = await loadNotifications()

    await configure(Notifications)
    return await ensurePermission(Notifications)
  } catch {
    return false
  }
}

export async function scheduleAppointmentReminder(
  appointment: AppointmentRecord,
  businessName: string
): Promise<boolean> {
  try {
    if (!getAppointmentRemindersEnabled()) {
      return false
    }

    const reminderAt = appointmentReminderDate(
      appointment.date,
      appointment.startMinutes
    )

    if (reminderAt.getTime() <= Date.now()) {
      return false
    }

    const Notifications = await loadNotifications()

    await configure(Notifications)

    if (!(await ensurePermission(Notifications))) {
      return false
    }

    await cancelAppointmentReminder(appointment.id)

    const time = `${String(Math.floor(appointment.startMinutes / 60)).padStart(
      2,
      '0'
    )}:${String(appointment.startMinutes % 60).padStart(2, '0')}`

    await Notifications.scheduleNotificationAsync({
      identifier: appointmentReminderIdentifier(appointment.id),
      content: {
        title: `${businessName}: turno de ${appointment.petName}`,
        body: `${appointment.clientName} tiene turno a las ${time}.`,
        data: { appointmentId: appointment.id }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
        channelId: CHANNEL_ID
      }
    })

    return true
  } catch {
    return false
  }
}

export async function cancelAppointmentReminder(
  appointmentId: number
): Promise<void> {
  try {
    const Notifications = await loadNotifications()

    await Notifications.cancelScheduledNotificationAsync(
      appointmentReminderIdentifier(appointmentId)
    )
  } catch {
    // El recordatorio puede no existir o el módulo no estar disponible.
  }
}

export async function sendTestNotification(businessName: string): Promise<boolean> {
  try {
    const Notifications = await loadNotifications()

    await configure(Notifications)

    if (!(await ensurePermission(Notifications))) {
      return false
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${businessName}: notificaciones activas`,
        body: 'Los recordatorios de turnos van a aparecer en este dispositivo.'
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: CHANNEL_ID
      }
    })

    return true
  } catch {
    return false
  }
}

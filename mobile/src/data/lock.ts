import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const BIOMETRIC_LOCK_KEY = 'vetgestion.biometric_lock'
const SUPPRESS_LOCK_MS = 120_000

let suppressLockUntil = 0

export interface BiometricCapability {
  available: boolean
  enrolled: boolean
  label: string
}

/**
 * Evita el bloqueo automático mientras el sistema muestra la cámara, el selector de fotos
 * o la hoja de compartir, actividades que mandan la app a segundo plano.
 */
export function suppressAutoLock(durationMs: number = SUPPRESS_LOCK_MS): void {
  suppressLockUntil = Date.now() + durationMs
}

export function isAutoLockSuppressed(): boolean {
  return Date.now() < suppressLockUntil
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [available, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync()
    ])

    let label = 'Biometría'

    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      label = 'Reconocimiento facial'
    } else if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      label = 'Huella digital'
    }

    return { available, enrolled, label }
  } catch {
    return { available: false, enrolled: false, label: 'Biometría' }
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY)) === '1'
  } catch {
    return false
  }
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, '1')
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_LOCK_KEY)
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const capability = await getBiometricCapability()

    if (!capability.available || !capability.enrolled) {
      return false
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear VetGestión',
      promptSubtitle: 'Confirmá tu identidad para continuar',
      cancelLabel: 'Usar contraseña',
      disableDeviceFallback: true
    })

    return result.success
  } catch {
    return false
  }
}

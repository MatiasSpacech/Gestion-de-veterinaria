import { requireNativeModule } from 'expo'

export interface ScryptNativeModule {
  deriveKeyHex(passwordHex: string, saltHex: string, keyLength: number): string
  randomBytesHex(size: number): string
  randomUUID(): string
}

const Scrypt = requireNativeModule<ScryptNativeModule>('Scrypt')

export function deriveKeyHex(
  passwordHex: string,
  saltHex: string,
  keyLength: number
): string {
  return Scrypt.deriveKeyHex(passwordHex, saltHex, keyLength)
}

export function randomBytesHex(size: number): string {
  return Scrypt.randomBytesHex(size)
}

export function randomUUID(): string {
  return Scrypt.randomUUID()
}

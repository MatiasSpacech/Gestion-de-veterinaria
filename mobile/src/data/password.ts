import { Buffer } from 'buffer'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const ALGORITHM = 'scrypt'
const KEY_LENGTH = 64

export function createPasswordSalt(): string {
  return randomBytes(16).toString('hex')
}

export function deriveScryptKey(
  password: string,
  salt: string,
  keyLength = KEY_LENGTH
): string {
  return scryptSync(password, salt, keyLength).toString('hex')
}

export function createPasswordHash(password: string, salt: string): string {
  return `${ALGORITHM}$${salt}$${deriveScryptKey(password, salt)}`
}

export function verifyPasswordHash(password: string, storedHash: string): boolean {
  const [algorithm, salt, expectedHex, ...rest] = storedHash.split('$')

  if (algorithm !== ALGORITHM || !salt || !expectedHex || rest.length > 0) {
    return false
  }

  const expected = Buffer.from(expectedHex, 'hex')

  if (expected.length === 0) {
    return false
  }

  const actual = scryptSync(password, salt, expected.length)

  return timingSafeEqual(actual, expected)
}

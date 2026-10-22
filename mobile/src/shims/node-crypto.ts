import { Buffer } from 'buffer'

import {
  deriveKeyHex,
  randomBytesHex,
  randomUUID as nativeRandomUUID
} from '../../modules/scrypt/src'

type BinaryLike = string | Uint8Array

function toHex(value: BinaryLike): string {
  if (typeof value === 'string') {
    return Buffer.from(value, 'utf8').toString('hex')
  }

  return Buffer.from(value).toString('hex')
}

export function randomBytes(size: number): Buffer {
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError('El tamaño de randomBytes debe ser un entero no negativo')
  }

  return Buffer.from(randomBytesHex(size), 'hex')
}

export function randomUUID(): string {
  return nativeRandomUUID()
}

export function scryptSync(
  password: BinaryLike,
  salt: BinaryLike,
  keyLength: number
): Buffer {
  return Buffer.from(
    deriveKeyHex(toHex(password), toHex(salt), keyLength),
    'hex'
  )
}

export function timingSafeEqual(left: BinaryLike, right: BinaryLike): boolean {
  const leftBytes = toHex(left)
  const rightBytes = toHex(right)

  if (leftBytes.length !== rightBytes.length) {
    throw new RangeError('Las entradas deben tener la misma longitud')
  }

  let difference = 0

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes.charCodeAt(index) ^ rightBytes.charCodeAt(index)
  }

  return difference === 0
}

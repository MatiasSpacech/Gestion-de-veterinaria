import { describe, expect, it } from 'vitest'

import { createPasswordHash, createPasswordSalt, verifyPasswordHash } from './password'

const SALT = '0123456789abcdef'
const PASSWORD = 'clave-segura'

// scrypt$sal$hash generado por node:crypto del escritorio con N=16384, r=8, p=1.
const NODE_HASH =
  'scrypt$0123456789abcdef$9ff521059a747c0502233fe0010dfbf749942a1def75d88df6093afd2290afe6ab0674c2981602d7d2b900253364f90817645bd1399604d8c05edc1a325be998'

describe('scrypt compatible con el escritorio', () => {
  it('genera el mismo hash que Node con la misma sal', () => {
    expect(createPasswordHash(PASSWORD, SALT)).toBe(NODE_HASH)
  })

  it('verifica un hash generado por Node', () => {
    expect(verifyPasswordHash(PASSWORD, NODE_HASH)).toBe(true)
    expect(verifyPasswordHash('otra-clave', NODE_HASH)).toBe(false)
  })

  it('rechaza hashes inválidos o alterados', () => {
    const altered = `${NODE_HASH.slice(0, -1)}${NODE_HASH.endsWith('0') ? '1' : '0'}`

    expect(verifyPasswordHash(PASSWORD, altered)).toBe(false)
    expect(verifyPasswordHash(PASSWORD, 'sha256$salt$abc')).toBe(false)
    expect(verifyPasswordHash(PASSWORD, 'scrypt$$abc')).toBe(false)
    expect(verifyPasswordHash(PASSWORD, 'scrypt$salt$xyz')).toBe(false)
  })

  it('genera sales aleatorias de 16 bytes en hexadecimal', () => {
    const salt = createPasswordSalt()

    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(createPasswordSalt()).not.toBe(salt)
  })
})

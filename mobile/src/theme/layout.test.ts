import { describe, expect, it } from 'vitest'

import {
  TABLET_MIN_WIDTH,
  contentMaxWidth,
  gridColumns,
  isLandscape,
  isTabletWidth
} from './layout'

describe('layout responsive', () => {
  it('trata como teléfono cualquier ancho menor al umbral', () => {
    expect(isTabletWidth(TABLET_MIN_WIDTH - 1)).toBe(false)
    expect(contentMaxWidth(390)).toBe(640)
    expect(gridColumns(390)).toBe(2)
  })

  it('trata como tablet el ancho del umbral y superiores', () => {
    expect(isTabletWidth(TABLET_MIN_WIDTH)).toBe(true)
    expect(contentMaxWidth(1280)).toBe(1040)
    expect(gridColumns(1280)).toBe(4)
  })

  it('detecta la orientación horizontal', () => {
    expect(isLandscape(1280, 800)).toBe(true)
    expect(isLandscape(412, 915)).toBe(false)
  })
})

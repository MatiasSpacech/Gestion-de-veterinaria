export const TABLET_MIN_WIDTH = 768

const PHONE_MAX_CONTENT_WIDTH = 640
const TABLET_MAX_CONTENT_WIDTH = 1040
const PHONE_COLUMNS = 2
const TABLET_COLUMNS = 4

export function isTabletWidth(width: number): boolean {
  return width >= TABLET_MIN_WIDTH
}

export function contentMaxWidth(width: number): number {
  return isTabletWidth(width) ? TABLET_MAX_CONTENT_WIDTH : PHONE_MAX_CONTENT_WIDTH
}

export function gridColumns(width: number): number {
  return isTabletWidth(width) ? TABLET_COLUMNS : PHONE_COLUMNS
}

export function isLandscape(width: number, height: number): boolean {
  return width > height
}

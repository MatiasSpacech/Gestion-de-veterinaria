export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** exponent

  return `${value.toLocaleString('es-AR', {
    minimumFractionDigits: exponent === 0 ? 0 : 1,
    maximumFractionDigits: 1
  })} ${units[exponent]}`
}

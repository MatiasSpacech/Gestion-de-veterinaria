export function getPetPhotoUrl(fileName: string | null | undefined): string | undefined {
  if (!fileName) {
    return undefined
  }

  return `vetphoto://pets/${encodeURIComponent(fileName)}`
}

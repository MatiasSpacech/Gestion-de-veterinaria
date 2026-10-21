import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, stat, unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { app, dialog, protocol } from 'electron'
import type { BrowserWindow } from 'electron'
import { AppError } from '@shared/errors'

const PHOTO_SCHEME = 'vetphoto'
const PHOTO_HOST = 'pets'
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const FILE_NAME_PATTERN = /^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

export function registerPetPhotoScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PHOTO_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true
      }
    }
  ])
}

function getPetPhotosDir(): string {
  return join(app.getPath('userData'), 'fotos-mascotas')
}

export function registerPetPhotoProtocol(): void {
  protocol.handle(PHOTO_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)

      if (url.hostname !== PHOTO_HOST) {
        return new Response('No encontrado', { status: 404 })
      }

      const fileName = decodeURIComponent(url.pathname.replace(/^\//, ''))

      if (!FILE_NAME_PATTERN.test(fileName)) {
        return new Response('No encontrado', { status: 404 })
      }

      const extension = extname(fileName).toLowerCase()
      const data = await readFile(join(getPetPhotosDir(), fileName))

      return new Response(new Uint8Array(data), {
        headers: {
          'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600'
        }
      })
    } catch {
      return new Response('No encontrado', { status: 404 })
    }
  })
}

export async function pickPetPhoto(
  parent: BrowserWindow | null
): Promise<{ fileName: string } | null> {
  const options: Electron.OpenDialogOptions = {
    title: 'Elegir foto de la mascota',
    properties: ['openFile'],
    filters: [
      {
        name: 'Imágenes',
        extensions: ['jpg', 'jpeg', 'png', 'webp']
      }
    ]
  }

  const result = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  const sourcePath = result.filePaths[0]
  const extension = extname(sourcePath).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new AppError('VALIDATION_ERROR', 'El formato de la imagen no es válido')
  }

  const fileInfo = await stat(sourcePath)

  if (!fileInfo.isFile()) {
    throw new AppError('VALIDATION_ERROR', 'La imagen seleccionada no es válida')
  }

  if (fileInfo.size > MAX_PHOTO_BYTES) {
    throw new AppError('VALIDATION_ERROR', 'La imagen no puede superar los 10 MB')
  }

  const directory = getPetPhotosDir()
  await mkdir(directory, { recursive: true })

  const fileName = `${randomUUID()}${extension}`
  await copyFile(sourcePath, join(directory, fileName))

  return { fileName }
}

export async function deletePetPhotoFile(fileName: string): Promise<void> {
  if (!FILE_NAME_PATTERN.test(fileName)) {
    return
  }

  try {
    await unlink(join(getPetPhotosDir(), fileName))
  } catch {
    return
  }
}

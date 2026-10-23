import { Directory, File, Paths } from 'expo-file-system'
import { randomUUID } from 'expo-crypto'
import * as ImagePicker from 'expo-image-picker'
import { AppError } from '@shared/errors'

import { suppressAutoLock } from './lock'

const PHOTO_FOLDER = 'photos'

export type PetPhotoSource = 'camera' | 'library'

function getPhotoDirectory(): Directory {
  const directory = new Directory(Paths.document, PHOTO_FOLDER)

  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true })
  }

  return directory
}

function extensionFor(asset: ImagePicker.ImagePickerAsset): string {
  const fileName = asset.fileName ?? ''
  const fromName = /\.([a-zA-Z0-9]+)$/.exec(fileName)?.[1]?.toLowerCase()

  if (fromName === 'png' || fromName === 'webp') {
    return fromName
  }

  if (fromName === 'jpeg' || fromName === 'jpg') {
    return fromName
  }

  if (asset.mimeType === 'image/png') {
    return 'png'
  }

  if (asset.mimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
}

export function getPetPhotoUri(fileName: string | null): string | null {
  if (!fileName) {
    return null
  }

  const file = new File(getPhotoDirectory(), fileName)

  return file.exists ? file.uri : null
}

export async function capturePetPhoto(
  source: PetPhotoSource
): Promise<string | null> {
  suppressAutoLock()

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    exif: false
  }

  let result: ImagePicker.ImagePickerResult

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()

    if (!permission.granted) {
      throw new AppError(
        'FORBIDDEN',
        'Habilitá el permiso de cámara para fotografiar mascotas'
      )
    }

    result = await ImagePicker.launchCameraAsync(options)
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options)
  }

  if (result.canceled || result.assets.length === 0) {
    return null
  }

  const asset = result.assets[0]
  const fileName = `${randomUUID()}.${extensionFor(asset)}`
  const destination = new File(getPhotoDirectory(), fileName)

  new File(asset.uri).copySync(destination, { overwrite: true })

  return fileName
}

export function deletePetPhoto(fileName: string | null): void {
  if (!fileName) {
    return
  }

  try {
    const file = new File(getPhotoDirectory(), fileName)

    if (file.exists) {
      file.delete()
    }
  } catch {
    // Si el archivo ya no existe no hay nada que limpiar.
  }
}

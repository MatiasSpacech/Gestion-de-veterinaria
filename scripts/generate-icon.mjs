import { Buffer } from 'node:buffer'
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildFolder = path.join(root, 'build')
const sizes = [16, 24, 32, 48, 64, 128, 256]

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  return value >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function encodePng(size, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  const rows = []

  for (let y = 0; y < size; y += 1) {
    rows.push(Buffer.from([0]))
    rows.push(pixels.subarray(y * size * 4, (y + 1) * size * 4))
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(x, right - radius))
  const cy = Math.max(top + radius, Math.min(y, bottom - radius))
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

function insideEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
}

function getPixel(x, y) {
  const left = 6
  const top = 6
  const right = 250
  const bottom = 250
  const radius = 52

  if (!insideRoundedRect(x, y, left, top, right, bottom, radius)) {
    return [0, 0, 0, 0]
  }

  const t = Math.max(0, Math.min(1, (y - top) / (bottom - top)))
  const red = Math.round(22 + (8 - 22) * t)
  const green = Math.round(184 + (128 - 184) * t)
  const blue = Math.round(112 + (80 - 112) * t)

  const isPaw =
    insideEllipse(x, y, 128, 158, 54, 43) ||
    insideEllipse(x, y, 72, 99, 24, 28) ||
    insideEllipse(x, y, 108, 76, 25, 30) ||
    insideEllipse(x, y, 150, 76, 25, 30) ||
    insideEllipse(x, y, 186, 100, 23, 27)

  if (isPaw) {
    return [255, 255, 255, 255]
  }

  return [red, green, blue, 255]
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const samples = 4
  const scale = 256 / size

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const sample = getPixel(
            (x + (sx + 0.5) / samples) * scale,
            (y + (sy + 0.5) / samples) * scale
          )
          red += sample[0] * sample[3]
          green += sample[1] * sample[3]
          blue += sample[2] * sample[3]
          alpha += sample[3]
        }
      }

      const total = samples * samples
      const offset = (y * size + x) * 4
      pixels[offset] = alpha > 0 ? Math.round(red / alpha) : 0
      pixels[offset + 1] = alpha > 0 ? Math.round(green / alpha) : 0
      pixels[offset + 2] = alpha > 0 ? Math.round(blue / alpha) : 0
      pixels[offset + 3] = Math.round(alpha / total)
    }
  }

  return encodePng(size, pixels)
}

mkdirSync(buildFolder, { recursive: true })
const images = sizes.map((size) => ({ size, data: render(size) }))

const icoHeader = Buffer.alloc(6)
icoHeader.writeUInt16LE(0, 0)
icoHeader.writeUInt16LE(1, 2)
icoHeader.writeUInt16LE(images.length, 4)

const directory = Buffer.alloc(images.length * 16)
let offset = 6 + directory.length

for (const [index, image] of images.entries()) {
  const entry = index * 16
  directory[entry] = image.size >= 256 ? 0 : image.size
  directory[entry + 1] = image.size >= 256 ? 0 : image.size
  directory[entry + 2] = 0
  directory[entry + 3] = 0
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(image.data.length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += image.data.length
}

writeFileSync(
  path.join(buildFolder, 'icon.ico'),
  Buffer.concat([icoHeader, directory, ...images.map((image) => image.data)])
)

const large = render(512)
writeFileSync(path.join(buildFolder, 'icon.png'), large)
console.log(`Iconos generados en ${buildFolder}`)

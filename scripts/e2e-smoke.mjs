import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { _electron: electron } = require('playwright')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'vetgestion-e2e-'))
const env = { ...process.env, VETGESTION_USER_DATA: userData }
delete env.ELECTRON_RUN_AS_NODE

const app = await electron.launch({
  args: [root],
  cwd: root,
  env,
  timeout: 60_000
})

let passed = false

try {
  const win = await app.firstWindow()
  await win.waitForLoadState('domcontentloaded')

  const metrics = await win.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    devicePixelRatio: window.devicePixelRatio
  }))
  const bounds = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getBounds()
  )

  console.log('Ventana:', JSON.stringify(metrics), 'Bounds:', JSON.stringify(bounds))
  console.log('Título:', await win.title())

  await win
    .getByRole('heading', { name: 'Cuenta de administrador' })
    .waitFor({ timeout: 20_000 })

  await win.getByLabel('Nombre completo').fill('Ana Test')
  await win.getByLabel('Usuario', { exact: true }).fill('admin')
  await win.getByLabel('Contraseña', { exact: true }).fill('clave12345')
  await win.getByLabel('Repetir contraseña').fill('clave12345')
  await win
    .getByRole('button', { name: 'Crear administrador y comenzar' })
    .click()

  await win
    .getByRole('heading', { name: /Buen día|Buenas tardes|Buenas noches/ })
    .waitFor({ timeout: 20_000 })

  const nav = await win.locator('.mantine-NavLink-root').allInnerTexts()
  const expectedNav = [
    'Panel',
    'Clientes',
    'Mascotas',
    'Inventario',
    'Ventas',
    'Agenda de turnos',
    'Reportes',
    'Usuarios',
    'Configuración'
  ]

  if (JSON.stringify(nav) !== JSON.stringify(expectedNav)) {
    throw new Error(`Navegación inesperada: ${nav.join(' | ')}`)
  }

  await win.getByRole('button', { name: 'Nuevo cliente' }).click()
  await win.getByRole('heading', { name: 'Clientes', level: 2 }).waitFor()

  await win.getByRole('button', { name: /Ana Test/ }).click()
  await win.getByRole('menuitem', { name: 'Cambiar contraseña' }).click()
  await win.getByLabel('Contraseña actual').fill('clave12345')
  await win.getByLabel('Nueva contraseña', { exact: true }).fill('clave67890')
  await win.getByLabel('Repetir nueva contraseña').fill('clave67890')
  await win.getByRole('button', { name: 'Guardar contraseña' }).click()
  await win.getByText('Contraseña actualizada').waitFor()

  await win.getByRole('button', { name: /Ana Test/ }).click()
  await win.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await win.getByRole('heading', { name: 'Bienvenido' }).waitFor()

  await win.getByLabel('Usuario').fill('admin')
  await win.getByLabel('Contraseña').fill('clave12345')
  await win.getByRole('button', { name: 'Ingresar' }).click()
  await win.getByText('Usuario o contraseña incorrectos').waitFor()

  await win.getByLabel('Contraseña').fill('clave67890')
  await win.getByRole('button', { name: 'Ingresar' }).click()
  await win
    .getByRole('heading', { name: /Buen día|Buenas tardes|Buenas noches/ })
    .waitFor({ timeout: 20_000 })

  passed = true
  console.log('E2E smoke OK: setup, dashboard, navegación, cambio de contraseña y login.')
} finally {
  await app.close().catch(() => {})

  if (passed) {
    fs.rmSync(userData, { recursive: true, force: true })
  } else {
    console.error('Datos de la prueba conservados en:', userData)
  }
}

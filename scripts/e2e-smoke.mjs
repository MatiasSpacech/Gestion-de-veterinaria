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

const nextVaccine = new Date()
nextVaccine.setDate(nextVaccine.getDate() + 20)
const nextVaccineDate = [
  nextVaccine.getFullYear(),
  String(nextVaccine.getMonth() + 1).padStart(2, '0'),
  String(nextVaccine.getDate()).padStart(2, '0')
].join('-')

const app = await electron.launch({
  args: [root],
  cwd: root,
  env,
  timeout: 60_000
})

let passed = false

try {
  const win = await app.firstWindow()
  win.on('pageerror', (error) => console.error('Renderer error:', error))
  win.on('console', (message) => {
    if (message.type() === 'error') {
      console.error('Renderer console:', message.text())
    }
  })
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

  await win.getByRole('button', { name: 'Nuevo cliente' }).first().click()
  await win.getByLabel('Nombre completo').waitFor()
  await win.getByLabel('Nombre completo').fill('Juan Pérez')
  await win.getByLabel('Teléfono').fill('11 5555-1234')
  await win.getByLabel('Correo electrónico').fill('juan@example.com')
  await win.getByRole('button', { name: 'Crear cliente' }).click()
  await win.getByText('Cliente creado').waitFor()
  await win.getByText('Juan Pérez', { exact: true }).waitFor()

  await win.getByRole('row', { name: /Juan Pérez/ }).click()
  await win.getByRole('heading', { name: 'Juan Pérez', level: 2 }).waitFor()

  await win.getByRole('button', { name: 'Agregar mascota' }).first().click()
  await win.getByText('Nueva mascota', { exact: true }).waitFor()
  await win.getByLabel('Nombre', { exact: true }).fill('Firulais')
  await win.getByLabel('Peso actual (kg)').fill('12.5')
  await win.getByRole('button', { name: 'Registrar mascota' }).click()
  await win.getByText('Mascota registrada', { exact: true }).waitFor()
  await win.getByText('Firulais', { exact: true }).click()
  await win.getByRole('heading', { name: 'Firulais', level: 2 }).waitFor()

  await win.getByRole('button', { name: 'Nuevo registro' }).click()
  await win.getByText('Nuevo registro clínico', { exact: true }).waitFor()
  await win.getByRole('combobox', { name: 'Tipo de registro' }).click()
  await win.getByRole('option', { name: 'Vacuna', exact: true }).click()
  await win.getByLabel('Título', { exact: true }).fill('Antirrábica')
  await win.getByLabel(/Próxima dosis/).fill(nextVaccineDate)
  await win.getByRole('button', { name: 'Guardar registro' }).click()
  await win.getByText('Registro guardado').waitFor()
  await win.getByText('Antirrábica', { exact: true }).first().waitFor()

  await win.getByRole('tab', { name: 'Vacunas' }).click()
  await win
    .getByRole('tabpanel', { name: 'Vacunas' })
    .getByText('Antirrábica', { exact: true })
    .waitFor()

  await win
    .locator('.mantine-NavLink-root')
    .filter({ hasText: /^Panel$/ })
    .click()
  await win.getByText('Recordatorios de vacunas', { exact: true }).waitFor()
  await win.getByText(/Firulais · Antirrábica/).waitFor()

  await win
    .locator('.mantine-NavLink-root')
    .filter({ hasText: /^Inventario$/ })
    .click()
  await win.getByRole('heading', { name: 'Inventario', level: 2 }).waitFor()

  await win.getByRole('button', { name: 'Categorías' }).click()
  await win.getByRole('heading', { name: 'Categorías de inventario' }).waitFor()
  await win.getByLabel('Nueva categoría').fill('Accesorios E2E')
  await win.getByRole('button', { name: 'Agregar' }).click()
  await win.getByText('Categoría creada').waitFor()
  await win.keyboard.press('Escape')
  await win
    .getByRole('heading', { name: 'Categorías de inventario' })
    .waitFor({ state: 'hidden' })

  await win.getByRole('button', { name: 'Nuevo producto' }).first().click()
  await win.getByLabel('Nombre', { exact: true }).waitFor()
  await win.getByLabel('Nombre', { exact: true }).fill('Alimento Premium E2E')
  await win.getByRole('combobox', { name: 'Categoría' }).click()
  await win.getByRole('option', { name: 'Accesorios E2E' }).click()
  await win.getByLabel('Costo').fill('1000')
  await win.getByLabel('Precio de venta').fill('1500')
  await win.getByLabel('Stock mínimo').fill('15')
  await win.getByRole('button', { name: 'Crear producto' }).click()
  await win.getByText('Producto creado').waitFor()

  const productRow = win.getByRole('row', { name: /Alimento Premium E2E/ })
  await productRow.waitFor()
  await productRow.getByRole('button', { name: 'Acciones' }).click()
  await win.getByRole('menuitem', { name: 'Registrar entrada' }).click()
  await win.getByText('Registrar entrada de stock', { exact: true }).waitFor()
  await win.getByLabel('Cantidad').fill('10')
  await win.getByLabel('Costo unitario').fill('1000')
  await win.getByLabel('Lote').fill('LOTE-E2E')
  await win.getByLabel('Vencimiento').fill(nextVaccineDate)
  await win.getByRole('button', { name: 'Registrar entrada' }).click()
  await win.getByText('Entrada registrada').waitFor()
  await productRow.getByText('10 unidad', { exact: true }).waitFor()

  await win.getByRole('tab', { name: 'Por vencer' }).click()
  await win
    .getByRole('tabpanel', { name: 'Por vencer' })
    .getByText('LOTE-E2E', { exact: true })
    .waitFor()

  await win.getByRole('tab', { name: 'Movimientos' }).click()
  await win
    .getByRole('tabpanel', { name: 'Movimientos' })
    .getByRole('row', { name: /Alimento Premium E2E/ })
    .filter({ hasText: 'Entrada' })
    .waitFor()

  await win
    .locator('.mantine-NavLink-root')
    .filter({ hasText: /^Panel$/ })
    .click()
  await win
    .locator('.mantine-Card-root')
    .filter({ hasText: 'Productos con stock bajo' })
    .getByText('1', { exact: true })
    .waitFor()

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
  console.log(
    'E2E smoke OK: setup, dashboard, clientes, mascotas, vacuna, recordatorios, inventario, contraseña y login.'
  )
} finally {
  await app.close().catch(() => {})

  if (passed) {
    fs.rmSync(userData, { recursive: true, force: true })
  } else {
    console.error('Datos de la prueba conservados en:', userData)
  }
}

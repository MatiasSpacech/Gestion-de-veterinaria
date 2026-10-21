import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  screen,
  session,
  shell
} from 'electron'
import log from 'electron-log/main'
import { closeDatabase, initDatabase } from './db'
import { registerIpcHandlers } from './ipc'

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join('; ')

app.setName('VetGestión')

if (process.env['VETGESTION_USER_DATA']) {
  app.setPath('userData', process.env['VETGESTION_USER_DATA'])
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  const openExternalUrl = (url: string): void => {
    try {
      const parsed = new URL(url)

      if (['https:', 'http:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
        void shell.openExternal(url)
      }
    } catch {
      log.warn('Se bloqueó una URL externa inválida')
    }
  }

  const createWindow = (): BrowserWindow => {
    const workArea = screen.getPrimaryDisplay().workAreaSize
    const width = Math.min(1280, Math.max(480, workArea.width - 24))
    const height = Math.min(840, Math.max(480, workArea.height - 24))

    const window = new BrowserWindow({
      width,
      height,
      minWidth: Math.min(960, width),
      minHeight: Math.min(640, height),
      center: true,
      show: false,
      title: 'VetGestión',
      backgroundColor: '#f4f8f6',
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: !app.isPackaged,
        spellcheck: false
      }
    })

    window.once('ready-to-show', () => {
      window.show()
    })

    const display = screen.getPrimaryDisplay()
    log.info('Ventana creada', {
      bounds: window.getBounds(),
      workArea: display.workArea,
      workAreaSize: display.workAreaSize,
      scaleFactor: display.scaleFactor
    })

    window.webContents.setWindowOpenHandler(({ url }) => {
      openExternalUrl(url)
      return { action: 'deny' }
    })

    window.webContents.on('will-navigate', (event, url) => {
      if (url !== window.webContents.getURL()) {
        event.preventDefault()
        openExternalUrl(url)
      }
    })

    window.webContents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })

    window.on('closed', () => {
      if (mainWindow === window) {
        mainWindow = null
      }
    })

    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
      void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return window
  }

  app.on('second-instance', () => {
    if (!mainWindow) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.vetgestion.app')

    log.transports.file.level = 'info'
    log.transports.console.level = app.isPackaged ? false : 'debug'

    Menu.setApplicationMenu(null)

    if (app.isPackaged) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [PRODUCTION_CSP]
          }
        })
      })
    }

    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false)
    })

    try {
      const userDataPath = app.getPath('userData')
      mkdirSync(userDataPath, { recursive: true })
      const databasePath = join(userDataPath, 'veterinaria.db')
      initDatabase(databasePath)
      log.info(`Base de datos inicializada en ${databasePath}`)
    } catch (error) {
      log.error('No se pudo inicializar la base de datos', error)
      dialog.showErrorBox(
        'Error al iniciar VetGestión',
        'No se pudo abrir la base de datos local. Revisá el registro de la aplicación o restaurá un backup.'
      )
      app.quit()
      return
    }

    registerIpcHandlers()
    mainWindow = createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    closeDatabase()
  })
}

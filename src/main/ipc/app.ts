import { app } from 'electron'
import { IPC } from '@shared/ipc'
import type { AppInfo } from '@shared/types'
import { registerPublicHandler } from './handle'

export function registerAppHandlers(): void {
  registerPublicHandler<void, AppInfo>(IPC.app.info, null, () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    platform: process.platform
  }))
}

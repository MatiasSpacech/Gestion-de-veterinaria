import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type VetApi } from '../shared/ipc'

const api: VetApi = {
  auth: {
    status: () => ipcRenderer.invoke(IPC.auth.status),
    setup: (input) => ipcRenderer.invoke(IPC.auth.setup, input),
    login: (input) => ipcRenderer.invoke(IPC.auth.login, input),
    logout: () => ipcRenderer.invoke(IPC.auth.logout),
    changePassword: (input) => ipcRenderer.invoke(IPC.auth.changePassword, input)
  },
  users: {
    list: () => ipcRenderer.invoke(IPC.users.list),
    create: (input) => ipcRenderer.invoke(IPC.users.create, input),
    update: (input) => ipcRenderer.invoke(IPC.users.update, input),
    resetPassword: (input) => ipcRenderer.invoke(IPC.users.resetPassword, input)
  },
  app: {
    info: () => ipcRenderer.invoke(IPC.app.info)
  }
}

contextBridge.exposeInMainWorld('api', api)

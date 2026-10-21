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
  clients: {
    list: (input) => ipcRenderer.invoke(IPC.clients.list, input),
    get: (input) => ipcRenderer.invoke(IPC.clients.get, input),
    create: (input) => ipcRenderer.invoke(IPC.clients.create, input),
    update: (input) => ipcRenderer.invoke(IPC.clients.update, input),
    setActive: (input) => ipcRenderer.invoke(IPC.clients.setActive, input)
  },
  pets: {
    list: (input) => ipcRenderer.invoke(IPC.pets.list, input),
    get: (input) => ipcRenderer.invoke(IPC.pets.get, input),
    create: (input) => ipcRenderer.invoke(IPC.pets.create, input),
    update: (input) => ipcRenderer.invoke(IPC.pets.update, input),
    setActive: (input) => ipcRenderer.invoke(IPC.pets.setActive, input),
    pickPhoto: () => ipcRenderer.invoke(IPC.pets.pickPhoto),
    medicalRecords: (input) => ipcRenderer.invoke(IPC.pets.medicalRecords, input),
    createMedicalRecord: (input) =>
      ipcRenderer.invoke(IPC.pets.createMedicalRecord, input),
    weightHistory: (input) => ipcRenderer.invoke(IPC.pets.weightHistory, input),
    upcomingVaccines: () => ipcRenderer.invoke(IPC.pets.upcomingVaccines)
  },
  app: {
    info: () => ipcRenderer.invoke(IPC.app.info)
  }
}

contextBridge.exposeInMainWorld('api', api)

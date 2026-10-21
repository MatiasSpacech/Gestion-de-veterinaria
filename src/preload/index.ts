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
  inventory: {
    listCategories: (input) =>
      ipcRenderer.invoke(IPC.inventory.listCategories, input),
    createCategory: (input) =>
      ipcRenderer.invoke(IPC.inventory.createCategory, input),
    updateCategory: (input) =>
      ipcRenderer.invoke(IPC.inventory.updateCategory, input),
    setCategoryActive: (input) =>
      ipcRenderer.invoke(IPC.inventory.setCategoryActive, input),
    listProducts: (input) => ipcRenderer.invoke(IPC.inventory.listProducts, input),
    getProduct: (input) => ipcRenderer.invoke(IPC.inventory.getProduct, input),
    createProduct: (input) => ipcRenderer.invoke(IPC.inventory.createProduct, input),
    updateProduct: (input) => ipcRenderer.invoke(IPC.inventory.updateProduct, input),
    setProductActive: (input) =>
      ipcRenderer.invoke(IPC.inventory.setProductActive, input),
    listBatches: (input) => ipcRenderer.invoke(IPC.inventory.listBatches, input),
    listExpiring: () => ipcRenderer.invoke(IPC.inventory.listExpiring),
    listMovements: (input) => ipcRenderer.invoke(IPC.inventory.listMovements, input),
    summary: () => ipcRenderer.invoke(IPC.inventory.summary),
    registerEntry: (input) => ipcRenderer.invoke(IPC.inventory.registerEntry, input),
    adjustStock: (input) => ipcRenderer.invoke(IPC.inventory.adjustStock, input),
    exportCsv: () => ipcRenderer.invoke(IPC.inventory.exportCsv)
  },
  app: {
    info: () => ipcRenderer.invoke(IPC.app.info)
  }
}

contextBridge.exposeInMainWorld('api', api)

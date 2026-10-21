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
    resetPassword: (input) => ipcRenderer.invoke(IPC.users.resetPassword, input),
    permissions: () => ipcRenderer.invoke(IPC.users.permissions),
    updatePermissions: (input) =>
      ipcRenderer.invoke(IPC.users.updatePermissions, input)
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
  sales: {
    create: (input) => ipcRenderer.invoke(IPC.sales.create, input),
    list: (input) => ipcRenderer.invoke(IPC.sales.list, input),
    get: (input) => ipcRenderer.invoke(IPC.sales.get, input),
    cancel: (input) => ipcRenderer.invoke(IPC.sales.cancel, input),
    summary: () => ipcRenderer.invoke(IPC.sales.summary)
  },
  reports: {
    get: (input) => ipcRenderer.invoke(IPC.reports.get, input),
    exportCsv: (input) => ipcRenderer.invoke(IPC.reports.exportCsv, input),
    exportPdf: (input) => ipcRenderer.invoke(IPC.reports.exportPdf, input)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settings.get),
    update: (input) => ipcRenderer.invoke(IPC.settings.update, input),
    pickBackupFolder: () => ipcRenderer.invoke(IPC.settings.pickBackupFolder),
    openBackupFolder: () => ipcRenderer.invoke(IPC.settings.openBackupFolder)
  },
  backups: {
    list: () => ipcRenderer.invoke(IPC.backups.list),
    create: () => ipcRenderer.invoke(IPC.backups.create),
    restore: (input) => ipcRenderer.invoke(IPC.backups.restore, input)
  },
  activity: {
    list: (input) => ipcRenderer.invoke(IPC.activity.list, input)
  },
  grooming: {
    listServices: (input) => ipcRenderer.invoke(IPC.grooming.listServices, input),
    createService: (input) => ipcRenderer.invoke(IPC.grooming.createService, input),
    updateService: (input) => ipcRenderer.invoke(IPC.grooming.updateService, input),
    setServiceActive: (input) =>
      ipcRenderer.invoke(IPC.grooming.setServiceActive, input),
    listGroomers: (input) => ipcRenderer.invoke(IPC.grooming.listGroomers, input),
    createGroomer: (input) => ipcRenderer.invoke(IPC.grooming.createGroomer, input),
    updateGroomer: (input) => ipcRenderer.invoke(IPC.grooming.updateGroomer, input),
    setGroomerActive: (input) =>
      ipcRenderer.invoke(IPC.grooming.setGroomerActive, input),
    listAppointments: (input) =>
      ipcRenderer.invoke(IPC.grooming.listAppointments, input),
    getAppointment: (input) =>
      ipcRenderer.invoke(IPC.grooming.getAppointment, input),
    createAppointment: (input) =>
      ipcRenderer.invoke(IPC.grooming.createAppointment, input),
    updateAppointment: (input) =>
      ipcRenderer.invoke(IPC.grooming.updateAppointment, input),
    setAppointmentStatus: (input) =>
      ipcRenderer.invoke(IPC.grooming.setAppointmentStatus, input),
    chargeAppointment: (input) =>
      ipcRenderer.invoke(IPC.grooming.chargeAppointment, input),
    summary: () => ipcRenderer.invoke(IPC.grooming.summary)
  },
  app: {
    info: () => ipcRenderer.invoke(IPC.app.info)
  }
}

contextBridge.exposeInMainWorld('api', api)

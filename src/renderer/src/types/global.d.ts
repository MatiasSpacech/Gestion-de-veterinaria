import type { VetApi } from '@shared/ipc'

declare global {
  interface Window {
    api: VetApi
  }
}

export {}

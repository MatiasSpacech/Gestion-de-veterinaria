import { registerAppHandlers } from './app'
import { registerAuthHandlers } from './auth'
import { registerUserHandlers } from './users'

export function registerIpcHandlers(): void {
  registerAuthHandlers()
  registerUserHandlers()
  registerAppHandlers()
}

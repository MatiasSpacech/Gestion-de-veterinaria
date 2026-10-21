import { registerAppHandlers } from './app'
import { registerAuthHandlers } from './auth'
import { registerClientHandlers } from './clients'
import { registerPetHandlers } from './pets'
import { registerUserHandlers } from './users'

export function registerIpcHandlers(): void {
  registerAuthHandlers()
  registerUserHandlers()
  registerClientHandlers()
  registerPetHandlers()
  registerAppHandlers()
}

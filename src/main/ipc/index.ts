import { registerAppHandlers } from './app'
import { registerAuthHandlers } from './auth'
import { registerClientHandlers } from './clients'
import { registerGroomingHandlers } from './grooming'
import { registerInventoryHandlers } from './inventory'
import { registerPetHandlers } from './pets'
import { registerSalesHandlers } from './sales'
import { registerUserHandlers } from './users'

export function registerIpcHandlers(): void {
  registerAuthHandlers()
  registerUserHandlers()
  registerClientHandlers()
  registerPetHandlers()
  registerInventoryHandlers()
  registerSalesHandlers()
  registerGroomingHandlers()
  registerAppHandlers()
}

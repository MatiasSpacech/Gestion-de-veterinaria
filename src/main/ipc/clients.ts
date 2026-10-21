import { IPC } from '@shared/ipc'
import {
  createClientSchema,
  getByIdSchema,
  listClientsSchema,
  setActiveSchema,
  updateClientSchema,
  type CreateClientInput,
  type GetByIdInput,
  type ListClientsInput,
  type SetActiveInput,
  type UpdateClientInput
} from '@shared/schemas'
import type { ClientDetail, ClientRecord } from '@shared/types'
import { getDb } from '@main/db'
import {
  createClient,
  getClientDetail,
  listClients,
  setClientActive,
  updateClient
} from '@main/services/clients'
import { registerProtectedHandler } from './handle'

export function registerClientHandlers(): void {
  registerProtectedHandler<ListClientsInput, ClientRecord[]>(
    IPC.clients.list,
    listClientsSchema,
    (input) => listClients(getDb(), input),
    { permission: 'clientes' }
  )

  registerProtectedHandler<GetByIdInput, ClientDetail>(
    IPC.clients.get,
    getByIdSchema,
    (input) => getClientDetail(getDb(), input.id),
    { permission: 'clientes' }
  )

  registerProtectedHandler<CreateClientInput, ClientRecord>(
    IPC.clients.create,
    createClientSchema,
    (input) => createClient(getDb(), input),
    { permission: 'clientes' }
  )

  registerProtectedHandler<UpdateClientInput, ClientRecord>(
    IPC.clients.update,
    updateClientSchema,
    (input) => updateClient(getDb(), input),
    { permission: 'clientes' }
  )

  registerProtectedHandler<SetActiveInput, ClientRecord>(
    IPC.clients.setActive,
    setActiveSchema,
    (input) => setClientActive(getDb(), input),
    { permission: 'clientes' }
  )
}

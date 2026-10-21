import { useState, type FormEvent } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  Table,
  Text,
  TextInput
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCategory, IconEdit, IconX } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProductCategory } from '@shared/types'
import { api } from '@renderer/lib/api'

interface CategoriesModalProps {
  opened: boolean
  onClose: () => void
}

export function CategoriesModal({
  opened,
  onClose
}: CategoriesModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories', { includeInactive: true }],
    queryFn: () => api.inventory.listCategories({ includeInactive: true }),
    enabled: opened
  })

  const resetForm = (): void => {
    setName('')
    setEditing(null)
  }

  const handleClose = (): void => {
    resetForm()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const trimmed = name.trim()

    if (trimmed.length < 2) {
      notifications.show({
        color: 'red',
        title: 'Nombre inválido',
        message: 'Ingresá al menos dos caracteres.'
      })
      return
    }

    setSaving(true)
    void (async () => {
      try {
        if (editing) {
          await api.inventory.updateCategory({ id: editing.id, name: trimmed })
        } else {
          await api.inventory.createCategory({ name: trimmed })
        }

        await queryClient.invalidateQueries({ queryKey: ['inventory'] })
        notifications.show({
          color: 'vetGreen',
          title: editing ? 'Categoría actualizada' : 'Categoría creada',
          message: `La categoría "${trimmed}" está disponible.`
        })
        resetForm()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar la categoría',
          message: error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setSaving(false)
      }
    })()
  }

  const handleToggle = (category: ProductCategory): void => {
    setSavingId(category.id)
    void (async () => {
      try {
        await api.inventory.setCategoryActive({
          id: category.id,
          active: !category.active
        })
        await queryClient.invalidateQueries({ queryKey: ['inventory'] })
        notifications.show({
          color: 'vetGreen',
          title: 'Categoría actualizada',
          message: category.active
            ? 'La categoría quedó inactiva.'
            : 'La categoría volvió a estar activa.'
        })
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo actualizar la categoría',
          message: error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setSavingId(null)
      }
    })()
  }

  const categories = categoriesQuery.data ?? []

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Categorías de inventario"
      size="lg"
      centered
    >
      <Stack gap="md">
        <form onSubmit={handleSubmit}>
          <Group align="flex-end" wrap="nowrap">
            <TextInput
              label={editing ? 'Editar categoría' : 'Nueva categoría'}
              placeholder="Ej. Alimentos"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              style={{ flex: 1 }}
              leftSection={<IconCategory size={16} />}
            />
            {editing ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Cancelar edición"
                onClick={resetForm}
              >
                <IconX size={18} />
              </ActionIcon>
            ) : null}
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar' : 'Agregar'}
            </Button>
          </Group>
        </form>

        {categoriesQuery.isPending ? (
          <Center py="xl">
            <Loader color="vetGreen" />
          </Center>
        ) : categories.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            Todavía no hay categorías.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={360}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Productos</Table.Th>
                  <Table.Th>Activa</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <Text size="sm" fw={600} c={category.active ? undefined : 'dimmed'}>
                        {category.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="gray" radius="sm">
                        {category.productCount}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Switch
                        checked={category.active}
                        disabled={savingId === category.id}
                        onChange={() => handleToggle(category)}
                        aria-label={`Activar ${category.name}`}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          aria-label={`Editar ${category.name}`}
                          onClick={() => {
                            setEditing(category)
                            setName(category.name)
                          }}
                        >
                          <IconEdit size={17} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Modal>
  )
}

import {
  IconBoxSeam,
  IconChartBar,
  IconLayoutDashboard,
  IconPaw,
  IconScissors,
  IconSettings,
  IconShieldLock,
  IconShoppingCart,
  IconUsers,
  type TablerIcon
} from '@tabler/icons-react'
import type { PermissionModule } from '@shared/roles'

export interface NavItem {
  label: string
  path: string
  icon: TablerIcon
  module: PermissionModule
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        label: 'Panel',
        path: '/',
        icon: IconLayoutDashboard,
        module: 'dashboard'
      }
    ]
  },
  {
    title: 'Gestión',
    items: [
      {
        label: 'Clientes',
        path: '/clientes',
        icon: IconUsers,
        module: 'clientes'
      },
      {
        label: 'Mascotas',
        path: '/mascotas',
        icon: IconPaw,
        module: 'mascotas'
      },
      {
        label: 'Inventario',
        path: '/inventario',
        icon: IconBoxSeam,
        module: 'inventario'
      },
      {
        label: 'Ventas',
        path: '/ventas',
        icon: IconShoppingCart,
        module: 'ventas'
      }
    ]
  },
  {
    title: 'Peluquería',
    items: [
      {
        label: 'Agenda de turnos',
        path: '/peluqueria',
        icon: IconScissors,
        module: 'peluqueria'
      }
    ]
  },
  {
    title: 'Análisis',
    items: [
      {
        label: 'Reportes',
        path: '/reportes',
        icon: IconChartBar,
        module: 'reportes'
      }
    ]
  },
  {
    title: 'Sistema',
    items: [
      {
        label: 'Usuarios',
        path: '/usuarios',
        icon: IconShieldLock,
        module: 'usuarios'
      },
      {
        label: 'Configuración',
        path: '/configuracion',
        icon: IconSettings,
        module: 'configuracion'
      }
    ]
  }
]

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

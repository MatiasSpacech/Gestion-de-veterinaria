import {
  IconBoxSeam,
  IconChartBar,
  IconScissors,
  IconSettings,
  IconShieldLock,
  IconShoppingCart
} from '@tabler/icons-react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { LoginPage } from './features/auth/LoginPage'
import { SetupPage } from './features/auth/SetupPage'
import { ClientDetailPage } from './features/clients/ClientDetailPage'
import { ClientsPage } from './features/clients/ClientsPage'
import { PetDetailPage } from './features/pets/PetDetailPage'
import { PetsPage } from './features/pets/PetsPage'
import { PlaceholderPage } from './features/placeholder/PlaceholderPage'
import { useAuth } from './lib/use-auth'

function SetupRoute(): React.JSX.Element {
  const { status, user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  if (status.initialized) {
    return <Navigate to="/login" replace />
  }

  return <SetupPage />
}

function LoginRoute(): React.JSX.Element {
  const { status, user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  if (!status.initialized) {
    return <Navigate to="/setup" replace />
  }

  return <LoginPage />
}

function ProtectedRoute(): React.JSX.Element {
  const { status, user } = useAuth()

  if (!status.initialized) {
    return <Navigate to="/setup" replace />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/setup" element={<SetupRoute />} />
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="clientes" element={<ClientsPage />} />
          <Route path="clientes/:id" element={<ClientDetailPage />} />
          <Route path="mascotas" element={<PetsPage />} />
          <Route path="mascotas/:id" element={<PetDetailPage />} />
          <Route
            path="inventario"
            element={
              <PlaceholderPage
                title="Inventario"
                description="Productos, lotes, vencimientos, movimientos de stock y alertas de reposición."
                phase="Fase 3"
                icon={IconBoxSeam}
              />
            }
          />
          <Route
            path="ventas"
            element={
              <PlaceholderPage
                title="Ventas"
                description="Punto de venta con control de stock, métodos de pago, historial y anulación de operaciones."
                phase="Fase 4"
                icon={IconShoppingCart}
              />
            }
          />
          <Route
            path="peluqueria"
            element={
              <PlaceholderPage
                title="Agenda de turnos"
                description="Calendario por peluquero, servicios, estados del turno, recordatorios por WhatsApp y cobro."
                phase="Fase 5"
                icon={IconScissors}
              />
            }
          />
          <Route
            path="reportes"
            element={
              <PlaceholderPage
                title="Reportes"
                description="Ventas por período, productos más vendidos, valorización de stock y estadísticas de peluquería."
                phase="Fase 6"
                icon={IconChartBar}
              />
            }
          />
          <Route
            path="usuarios"
            element={
              <PlaceholderPage
                title="Usuarios"
                description="Alta de empleados, roles y permisos por módulo."
                phase="Fase 6"
                icon={IconShieldLock}
              />
            }
          />
          <Route
            path="configuracion"
            element={
              <PlaceholderPage
                title="Configuración"
                description="Datos del local, horarios, servicios, peluqueros, backups y preferencias de la aplicación."
                phase="Fase 6"
                icon={IconSettings}
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

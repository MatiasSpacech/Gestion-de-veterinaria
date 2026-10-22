import { PhasePlaceholder } from '../../src/components/PhasePlaceholder'
import { Screen } from '../../src/components/Screen'

export default function ClientsScreen() {
  return (
    <Screen
      title="Clientes"
      subtitle="Fichas de clientes, mascotas e historial clínico."
    >
      <PhasePlaceholder
        icon="people-outline"
        phase="Fase 3"
        title="Clientes y mascotas"
        description="La ficha completa de cada cliente y su mascota, pensada para el mostrador."
        bullets={[
          'Datos de contacto y acciones rápidas de llamada y WhatsApp',
          'Historial clínico, vacunas, peso y fotos',
          'Búsqueda por nombre, teléfono o mascota'
        ]}
      />
    </Screen>
  )
}

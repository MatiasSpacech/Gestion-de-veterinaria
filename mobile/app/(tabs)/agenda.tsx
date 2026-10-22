import { PhasePlaceholder } from '../../src/components/PhasePlaceholder'
import { Screen } from '../../src/components/Screen'

export default function AgendaScreen() {
  return (
    <Screen
      title="Agenda"
      subtitle="Turnos, estados y cobro de peluquería."
    >
      <PhasePlaceholder
        icon="calendar-outline"
        phase="Fase 3"
        title="Agenda y peluquería"
        description="Acá vas a ver el día completo del local y administrar cada turno."
        bullets={[
          'Agenda diaria en teléfono y vista semanal en tablet',
          'Estados del turno: pendiente, en curso, atendido y cancelado',
          'Cobro de servicios y envío de recordatorios por WhatsApp'
        ]}
      />
    </Screen>
  )
}

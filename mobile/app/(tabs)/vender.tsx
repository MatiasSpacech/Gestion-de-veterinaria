import { PhasePlaceholder } from '../../src/components/PhasePlaceholder'
import { Screen } from '../../src/components/Screen'

export default function SellScreen() {
  return (
    <Screen title="Vender" subtitle="Punto de venta táctil con cálculo de vuelto.">
      <PhasePlaceholder
        icon="cart-outline"
        phase="Fase 3"
        title="Punto de venta"
        description="El carrito, los medios de pago y la anulación van a vivir en esta pestaña."
        bullets={[
          'Búsqueda grande por nombre o código de barras',
          'Carrito fijo con descuentos y cálculo de vuelto',
          'Anulación de ventas con permisos de administrador'
        ]}
      />
    </Screen>
  )
}

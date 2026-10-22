# Resultados de la Fase 3: operación diaria

Fecha de ejecución: 22/10/2026.

## Qué se verificó

| Punto del plan | Estado | Evidencia |
| --- | --- | --- |
| Panel | OK | `mobile/src/features/dashboard` y `mobile/app/(tabs)/index.tsx` |
| Clientes, mascotas e historial | OK | `mobile/src/features/clients`, `mobile/app/(tabs)/clientes.tsx`, `mobile/app/clientes/[id].tsx` y `mobile/app/clientes/nuevo.tsx` |
| Inventario | OK | `mobile/src/features/inventory` y `mobile/app/inventario.tsx` |
| Ventas | OK | `mobile/src/features/sales`, `mobile/app/(tabs)/vender.tsx` y `mobile/app/ventas.tsx` |
| Peluquería | OK | `mobile/src/features/grooming` y `mobile/app/(tabs)/agenda.tsx` |

## Cómo está armado

- Cada módulo tiene un servicio en `mobile/src/features/<modulo>/<modulo>-service.ts` que llama a
  los servicios del escritorio, valida la entrada con los esquemas Zod compartidos, exige el
  permiso del rol y deja registro en la auditoría.
- Los servicios reciben la base como argumento opcional. En la app usan la base local; en los tests
  usan el adaptador sobre `node:sqlite`.
- Las pantallas usan el kit de componentes táctiles: `Screen`, `SectionCard`, `MetricCard`,
  `ListRow`, `EmptyState`, `AppButton` y `AppTextInput`, todos con objetivos de 48 dp.

## Panel

El panel de Inicio muestra, con datos reales de la base local:

- Ventas de hoy: cantidad, total y ticket promedio.
- Turnos de hoy: cantidad y turnos activos.
- Stock bajo: cantidad de productos por reponer y los que están sin stock.
- Vacunas próximas: cantidad y detalle, usando el plazo configurado en `alerts.vaccine_days`.
- Turnos del día, stock bajo, vacunas próximas y las últimas ventas, con sus listas.
- Cierre del mes con la facturación del mes.

## Verificado en el emulador

1. El panel muestra los valores reales: con la base de la Fase 0 más la venta nueva, muestra
   1 venta de hoy por $ 1.500,00.
2. Desde Vender se agregó el producto al carrito, se cobró en efectivo y se registró la venta
   `V-000014`, el número continúa la serie del escritorio.
3. La venta bajó el stock del producto de 5 a 4 y el panel y el inventario lo reflejan.
4. Se creó el cliente `Maria Gomez` desde Clientes → Nuevo y la app saltó a la ficha del cliente.
5. El inventario lista el producto con su SKU, su precio, el stock actual y la acción de carga.

## Pruebas automáticas

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` en `mobile/` | OK, sin errores |
| `npm run lint` en `mobile/` | OK, sin errores |
| `npm test` en `mobile/` | 37 tests aprobados |

`mobile/src/features/operations.test.ts` cubre el alta de clientes, el rechazo de clientes con
nombre inválido, la entrada de stock y el registro de una venta con su historial.

## Pendiente para las fases siguientes

- association del cliente y la mascota a la venta y al turno desde el punto de venta.
- Alta de mascotas y de historial clínico desde la ficha del cliente.
- Alta de turnos desde la agenda.
- Lectura de código de barras y cámara (Fase 4).

## Próximos pasos

1. Fase 4: usuarios y configuración, cámara y códigos de barras, notificaciones, WhatsApp,
   PDF/CSV y bloqueo biométrico.
2. Fase 5: importación de backups de escritorio, pruebas E2E con Maestro y APK firmado.

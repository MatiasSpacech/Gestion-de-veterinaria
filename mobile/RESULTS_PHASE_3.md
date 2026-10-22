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

1. El panel muestra los valores reales: con la base de la Fase 0 más las ventas nuevas, muestra
   las ventas del día por $ 1.500,00.
2. Desde Vender se agregó el producto al carrito y se cobró en efectivo. La venta `V-000014` se
   registró y el número continúa la serie del escritorio.
3. La venta bajó el stock del producto de 5 a 4 y el panel y el inventario lo reflejan.
4. Se creó el cliente `Maria Gomez` desde Clientes → Nuevo y la app saltó a la ficha del cliente.
5. El inventario lista el producto con su SKU, su precio, el stock actual y la acción de carga.
6. Desde la ficha de Maria se agregó la mascota `Luna` (perro, caniche, hembra, 8,5 kg) y la app
   volvió a la ficha con la mascota listada y su peso inicial en el historial.
7. Desde el historial de Luna se agregó la vacuna `Antirrabica` con próxima dosis `22/10/2027`; el
   registro aparece en la ficha y el subtítulo muestra la próxima vacuna.
8. En Vender se asoció `Maria Gomez · Luna` a la venta `V-000015`; el historial de ventas muestra el
   cliente en la fila.
9. El alta de turnos muestra la búsqueda de clientes, las mascotas del cliente, los servicios y la
   fecha y hora. En el emulador no hay peluqueros cargados, así que la pantalla guía a cargarlos
   desde el escritorio; el alta quedó cubierta por los tests.

## Pruebas automáticas

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` en `mobile/` | OK, sin errores |
| `npm run lint` en `mobile/` | OK, sin errores |
| `npm test` en `mobile/` | 40 tests aprobados |

`mobile/src/features/operations.test.ts` cubre el alta de clientes, el rechazo de clientes con
nombre inválido, la entrada de stock, el registro de una venta con su historial, el alta de mascotas
con su peso inicial, los registros del historial clínico, el alta de turnos con peluquero y
servicios, y la asociación de cliente y mascota a la venta.

## Cierre de la fase

La operación diaria queda cubierta de punta a punta en el dispositivo:

- Ficha del cliente con alta de mascotas y de registros de historial (consulta, vacuna,
  desparasitación, cirugía, tratamiento, nota y peso).
- Agenda con alta de turnos, cambio de estado y cobro.
- Punto de venta con cliente y mascota opcionales, descuento y medio de pago.
- Panel con el resumen del día.

## Pendiente para las fases siguientes

- Cámara y lectura de códigos de barras (Fase 4).
- Notificaciones locales, WhatsApp, PDF/CSV y bloqueo biométrico (Fase 4).
- Alta de peluqueros y de usuarios desde el móvil (Fase 4).
- Importación de backups del escritorio, pruebas E2E y APK firmado (Fase 5).

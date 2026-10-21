# VetGestión — Plan de desarrollo

Aplicación de escritorio para Windows destinada a la gestión de un local veterinario: stock, ventas, clientes, mascotas con historial clínico y turnos de peluquería.

## Decisiones confirmadas

- Aplicación de escritorio Windows, uso en una sola PC, funcionamiento offline.
- Stack: Electron + React + TypeScript + Mantine + SQLite.
- Login con usuarios y roles: Admin, Vendedor y Peluquero.
- Permisos configurables por rol.
- Ventas sin facturación fiscal: registro interno, stock y método de pago.
- Peluquería con agenda por horario y peluquero.
- Extras incluidos:
  - Lotes y vencimientos de stock.
  - Recordatorios de vacunas.
  - Envío de turnos por WhatsApp mediante enlace con mensaje prellenado.
  - Backup automático.
  - Exportación de reportes a CSV y PDF.
- Fuera de alcance por ahora:
  - Facturación electrónica AFIP/ARCA.
  - Uso en red o multiusuario simultáneo.
  - Firma digital del instalador.

## Stack técnico

- Electron 44.
- electron-vite 6 y Vite 8.
- React 19.
- TypeScript.
- Mantine 9 para componentes, formularios, fechas y notificaciones.
- Tabler Icons para iconografía.
- Recharts para gráficos.
- SQLite mediante better-sqlite3 13 (binarios N-API).
- TanStack Query para estado remoto.
- Zod para validación de datos IPC.
- Vitest para pruebas.
- electron-builder para instalador NSIS.
- electron-log para registros locales.

Los comandos npm se ejecutan con `npm.cmd` porque la política de ejecución de PowerShell bloquea `npm.ps1`.

## Arquitectura

La aplicación se divide en tres procesos:

1. `main`: acceso a SQLite, reglas de negocio, autenticación, backups e IPC.
2. `preload`: puente seguro y acotado mediante contextBridge.
3. `renderer`: interfaz React; no accede directamente a Node ni a la base de datos.

Organización por dominios:

- auth
- clientes
- mascotas
- historial clínico
- inventario
- ventas
- peluquería
- reportes
- configuración

Las reglas críticas se validan en el proceso principal: stock, totales, permisos y solapamiento de turnos.

## Modelo de datos

- Usuarios y permisos: `users`, `role_permissions`.
- Clientes y mascotas: `clients`, `pets`, `medical_records`.
- Stock: `product_categories`, `products`, `product_batches`, `stock_movements`.
- Peluquería: `services`, `groomers`, `appointments`, `appointment_services`.
- Ventas: `sales`, `sale_items`, `sale_payments`, `sale_batch_allocations`.
- Sistema: `settings`, `activity_log`, `schema_migrations`.

Detalles:

- Importes guardados en centavos para evitar errores de redondeo.
- Fechas en formato ISO.
- Horarios en minutos desde las 00:00.
- Borrado lógico para registros con historial.

## Módulos y pantallas

1. Primer inicio y login.
   - Creación del administrador.
   - Inicio de sesión.
   - Cambio de contraseña.
2. Panel.
   - Ventas del día, semana y mes.
   - Ticket promedio.
   - Stock bajo y lotes por vencer.
   - Turnos del día.
   - Vacunas próximas.
   - Accesos rápidos.
3. Clientes.
   - Búsqueda por nombre, teléfono o DNI.
   - Alta, edición y desactivación.
   - Mascotas asociadas.
   - Historial de ventas y turnos.
4. Mascotas.
   - Foto y datos generales.
   - Especie, raza, sexo, nacimiento, peso, alergias y notas.
   - Historial clínico, turnos y evolución de peso.
5. Historial clínico.
   - Consultas, vacunas, desparasitación, cirugías, tratamientos y notas.
   - Próxima dosis, profesional y gráfico de peso.
6. Inventario.
   - Categorías.
   - SKU y código de barras.
   - Precios de costo y venta.
   - Stock mínimo.
   - Entradas con lote y vencimiento.
   - Ajustes e historial de movimientos.
   - Alertas de stock bajo y vencimientos.
7. Ventas.
   - Búsqueda de productos y servicios.
   - Carrito, cantidades y descuento.
   - Cliente opcional.
   - Métodos de pago: efectivo, tarjeta y transferencia.
   - Descuento de stock dentro de una transacción.
   - Prohibición de stock negativo.
8. Historial de ventas.
   - Filtros por fecha y cliente.
   - Detalle de la venta.
   - Anulación por administrador con reposición de stock y motivo.
9. Peluquería.
   - Agenda diaria y semanal por peluquero.
   - Creación de turnos desde huecos libres.
   - Servicios con duración y precio.
   - Control de solapamientos.
   - Estados: pendiente, confirmado, en proceso, completado, cancelado y no asistió.
   - Envío por WhatsApp.
   - Cobro del turno vinculado a una venta.
10. Reportes.
    - Ventas por período.
    - Medios de pago.
    - Productos más vendidos.
    - Valorización de stock.
    - Stock bajo y vencimientos.
    - Estadísticas de peluquería.
    - Exportación CSV y PDF.
11. Configuración.
    - Datos del local y moneda.
    - Horarios y duración de turnos.
    - Servicios y peluqueros.
    - Usuarios y matriz de permisos.
    - Plantilla de WhatsApp.
    - Días de aviso.
    - Backups.

## Reglas de negocio

- Toda venta se calcula y valida en el proceso principal.
- Las salidas de stock consumen primero los lotes más próximos a vencer (FEFO).
- Si un producto no tiene lote, se utiliza un lote genérico "Sin lote".
- Una venta no puede dejar stock negativo.
- La anulación de venta solo la realiza un administrador; repone los lotes consumidos y deja auditoría.
- No puede haber dos turnos superpuestos para el mismo peluquero.
- Los turnos guardan precio y duración históricos del servicio.
- Los recordatorios de vacunas se calculan con la última dosis registrada por mascota, tipo y título.
- Los registros con historial no se eliminan físicamente.
- Acciones sensibles restringidas a administradores:
  - Anular ventas.
  - Ajustar stock.
  - Gestionar usuarios.
  - Editar permisos.
  - Restaurar backups.

## Seguridad y datos

- Base de datos en `%APPDATA%\VetGestión\veterinaria.db`.
- Fotos y archivos en la carpeta de datos de la aplicación.
- Backup automático diario en `Documentos\VetGestión\Backups`, con ruta configurable.
- Retención de 30 copias.
- Backup previo a migraciones.
- Restauración asistida con reinicio de la aplicación.
- Contraseñas con scrypt y salt.
- Sesión en memoria.
- `contextIsolation` y `sandbox` habilitados.
- `nodeIntegration` deshabilitado.
- CSP en producción.
- Validación Zod en todos los canales IPC.
- Enlaces externos restringidos.
- Instancia única.
- Registro local de errores con electron-log.

## Fases

### Fase 1 — Base

- Scaffold del proyecto.
- Configuración de electron-vite, TypeScript, ESLint y Vitest.
- Tema y estilos.
- SQLite, migraciones y datos iniciales.
- Autenticación, primer administrador, roles y permisos.
- IPC seguro.
- Login, primer inicio, layout y navegación.
- Panel inicial.

### Fase 2 — Clientes y mascotas

- CRUD de clientes.
- CRUD de mascotas con foto.
- Búsqueda y desactivación.
- Historial clínico.
- Evolución de peso.
- Recordatorios de vacunas.

### Fase 3 — Inventario

- Categorías y productos.
- Lotes y vencimientos.
- Entradas, ajustes y movimientos.
- Alertas de stock bajo y vencimiento.
- Exportación de inventario.

### Fase 4 — Ventas

- POS.
- Transacciones de stock.
- Historial de ventas.
- Anulación y reposición.
- Métricas del panel.

### Fase 5 — Peluquería

- Servicios y peluqueros.
- Agenda diaria y semanal.
- Turnos, estados y solapamientos.
- WhatsApp.
- Cobro vinculado a venta.

### Fase 6 — Reportes y administración

- Reportes y exportación CSV/PDF.
- Configuración completa.
- Usuarios y permisos configurables.
- Backups y restauración.
- Auditoría.

### Fase 7 — Entrega

- Icono y branding.
- Instalador NSIS.
- Pruebas finales.
- Verificación de la aplicación empaquetada.

## Pruebas

- Unitarias:
  - Cálculos de venta y descuentos.
  - FEFO y stock insuficiente.
  - Rollback de transacciones.
  - Solapamiento de turnos.
  - Permisos.
  - Hash y verificación de contraseñas.
- Integración:
  - Repositorios contra SQLite temporal.
  - Migraciones.
  - Restauración de backups.
- End-to-end:
  - Playwright: primer inicio, panel, clientes, mascotas, vacuna con recordatorio, inventario con categoría, producto, entrada y vencimiento, cambio de contraseña y login.
  - Comando: `npm.cmd run test:e2e`.
- Manuales:
  - Alta de cliente y mascota.
  - Vacuna con recordatorio.
  - Entrada con lote.
  - Venta y anulación.
  - Turno superpuesto.
  - Cobro de turno.
  - Backup y restauración.
- En cada fase se ejecutan typecheck, lint y pruebas.

## Entregables

- Aplicación funcionando en desarrollo.
- Instalador `.exe` generado con electron-builder.
- Base de datos local con migraciones automáticas.
- Datos iniciales y creación del administrador en el primer inicio.

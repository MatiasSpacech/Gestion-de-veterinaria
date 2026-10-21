# VetGestión

Aplicación de escritorio para Windows pensada para la gestión integral de una veterinaria y su peluquería. Funciona de forma local y offline, sin servidores ni servicios en la nube: todos los datos se guardan en una base SQLite dentro de la computadora.

Versión actual: **1.0.0**

Repositorio: <https://github.com/MatiasSpacech/Gestion-de-veterinaria>

## Índice

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación del instalador](#instalación-del-instalador)
- [Primer inicio](#primer-inicio)
- [Desarrollo](#desarrollo)
- [Scripts disponibles](#scripts-disponibles)
- [Roles y permisos](#roles-y-permisos)
- [Módulos](#módulos)
- [Reglas de negocio](#reglas-de-negocio)
- [Datos y backups](#datos-y-backups)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Seguridad](#seguridad)
- [Pruebas y verificación](#pruebas-y-verificación)
- [Generar el instalador](#generar-el-instalador)
- [Solución de problemas](#solución-de-problemas)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Licencia](#licencia)

## Características

- Gestión de clientes y mascotas con foto, datos clínicos, historial y evolución de peso.
- Historial clínico con consultas, vacunas, desparasitaciones, cirugías, tratamientos y notas.
- Recordatorios de vacunas y alertas de vencimiento configurables.
- Inventario con categorías, SKU, código de barras, costos, precios y stock mínimo.
- Lotes y vencimientos con control FEFO (primero vence, primero sale) y movimientos auditables.
- Punto de venta con productos, carrito, descuentos, clientes y medios de pago.
- Anulación de ventas por administrador con reposición de stock y motivo.
- Peluquería con agenda diaria y semanal por peluquero.
- Turnos con múltiples servicios, duración, precio histórico, estados y control de solapamientos.
- Cobro de turnos que genera una venta de servicios sin descontar stock.
- Envío de recordatorios de turnos por WhatsApp con plantilla configurable.
- Reportes por período con ventas, ticket promedio, rubros, medios de pago, ranking de productos/servicios, ventas diarias e inventario.
- Exportación de reportes a CSV y PDF.
- Administración de usuarios, roles y permisos por módulo.
- Backups manuales y automáticos diarios, con retención configurable y restauración asistida.
- Auditoría de operaciones sensibles.
- Aplicación completamente offline, con sesión local y contraseñas protegidas.

## Tecnologías

- **Electron 44** para la aplicación de escritorio.
- **electron-vite 6** para el proceso de build.
- **React 19** + **TypeScript**.
- **Mantine 9** para componentes, formularios y notificaciones.
- **TanStack Query 5** para el estado del servidor local.
- **better-sqlite3 13** como base de datos embebida.
- **Zod 4** para validación de datos en el proceso principal.
- **Vitest** para pruebas unitarias y de integración.
- **Playwright** para pruebas end-to-end sobre Electron.
- **electron-builder** para generar el instalador NSIS de Windows.

## Requisitos

### Para usar la aplicación

- Windows 10 u 11 de 64 bits.
- Aproximadamente 300 MB de espacio libre.
- No requiere conexión a internet ni servidor externo.

### Para desarrollar o empaquetar

- Node.js 22 o superior (probado con Node.js 24).
- npm 10 o superior.
- Windows para generar el instalador NSIS.

## Instalación del instalador

El instalador se genera en:

```text
release/VetGestion-Setup-1.0.0.exe
```

Pasos:

1. Ejecutar el instalador.
2. Elegir la carpeta de instalación si se desea.
3. Finalizar la instalación.
4. Abrir **VetGestión** desde el menú Inicio o el acceso directo del escritorio.

El instalador no está firmado digitalmente. Windows SmartScreen puede mostrar una advertencia la primera vez; se puede continuar eligiendo la opción de ejecutar de todos modos.

Desinstalar la aplicación no elimina la base de datos, las fotos ni los backups. Esto permite reinstalar sin perder información. Para borrar todos los datos, hacerlo manualmente desde las rutas indicadas en [Datos y backups](#datos-y-backups).

## Primer inicio

La primera vez que se abre la aplicación se debe crear el administrador:

1. Ingresar nombre completo, usuario y contraseña.
2. La contraseña debe tener al menos 8 caracteres.
3. Al completar el alta se inicia sesión automáticamente.

Después se recomienda:

1. Revisar **Configuración > General**: nombre del local, teléfono, dirección, horarios, días de apertura, avisos y plantilla de WhatsApp.
2. Configurar la carpeta y retención de backups en **Configuración > Backups**.
3. Crear los servicios y peluqueros en **Agenda de turnos**.
4. Crear los usuarios necesarios en **Usuarios y permisos**.
5. Cargar productos y stock en **Inventario**.

## Desarrollo

Clonar el repositorio y entrar en la carpeta:

```powershell
git clone https://github.com/MatiasSpacech/Gestion-de-veterinaria.git
cd "Gestion-de-veterinaria"
```

Instalar dependencias:

```powershell
npm install
```

En PowerShell se recomienda usar `npm.cmd` si la política de ejecución de scripts bloquea `npm`:

```powershell
npm.cmd install
```

Iniciar la aplicación en modo desarrollo:

```powershell
npm.cmd run dev
```

La aplicación usa una base de datos independiente en el directorio de datos de Electron. Para aislar pruebas o desarrollo se puede definir la variable de entorno `VETGESTION_USER_DATA` con una carpeta temporal.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm.cmd run dev` | Inicia Electron con recarga en desarrollo. |
| `npm.cmd run build` | Compila main, preload y renderer en `out/`. |
| `npm.cmd run preview` | Previsualiza la compilación. |
| `npm.cmd run typecheck` | Verifica tipos de Node y del renderer. |
| `npm.cmd run lint` | Ejecuta ESLint. |
| `npm.cmd test` | Ejecuta Vitest. |
| `npm.cmd run test:watch` | Vitest en modo interactivo. |
| `npm.cmd run test:e2e` | Compila y ejecuta el flujo E2E completo en Electron. |
| `npm.cmd run test:e2e:packaged` | Ejecuta el E2E contra `release/win-unpacked/VetGestión.exe`. Requiere haber generado el paquete. |
| `npm.cmd run dist` | Compila y genera el instalador NSIS en `release/`. |
| `npm.cmd run dist:dir` | Genera la aplicación desempaquetada sin instalador. |

El script `scripts/generate-icon.mjs` regenera `build/icon.png` e `build/icon.ico` a partir del diseño vectorial programático del icono.

## Roles y permisos

La aplicación incluye tres roles:

| Rol | Acceso inicial |
| --- | --- |
| Administrador | Todos los módulos. |
| Vendedor | Panel, Clientes, Mascotas, Inventario y Ventas. |
| Peluquero | Panel, Clientes, Mascotas y Peluquería. |

Los permisos de **Vendedor** y **Peluquero** se pueden modificar desde **Usuarios y permisos > Permisos por rol**. Los módulos **Usuarios** y **Configuración** son siempre exclusivos del administrador.

Además, hay operaciones que requieren administrador independientemente de los permisos del módulo:

- Anular ventas.
- Ajustar stock.
- Crear, editar o desactivar usuarios.
- Editar permisos de roles.
- Gestionar, crear o restaurar backups.
- Modificar configuración del sistema.

La sesión se mantiene en memoria. Al cerrar la aplicación se cierra la sesión.

## Módulos

### Panel

Muestra métricas de ventas del día, turnos de hoy, productos con stock bajo, vacunas próximas, recordatorios, accesos rápidos y actividad reciente.

### Clientes

Alta, edición, búsqueda por nombre, teléfono o documento, desactivación lógica y acceso a mascotas, ventas y turnos asociados.

### Mascotas

Datos generales, foto, especie, raza, sexo, nacimiento, peso, alergias y notas. Incluye historial clínico, vacunas, evolución de peso y turnos.

### Historial clínico

Registros de consultas, vacunas, desparasitaciones, cirugías, tratamientos y notas. Permite indicar próxima dosis, profesional y fecha. La próxima dosis alimenta los recordatorios.

### Inventario

- Categorías y productos.
- SKU y código de barras únicos.
- Costo, precio de venta, stock y stock mínimo.
- Ingreso de stock con lote, costo y vencimiento.
- Ajustes manuales de stock con motivo y auditoría.
- Movimientos por entrada, venta, anulación, ajuste y devolución.
- Alertas de stock bajo, sin stock y lotes por vencer.
- Exportación CSV del inventario.

### Ventas

Punto de venta con búsqueda de productos, cantidades, descuentos, cliente opcional y medios de pago: efectivo, tarjeta y transferencia. El stock se descuenta dentro de una transacción y nunca puede quedar negativo.

El historial permite filtrar por fecha y cliente, ver el detalle y anular ventas. La anulación repone las cantidades a los lotes originales y registra motivo, usuario y fecha.

### Peluquería

- Agenda diaria y semanal por peluquero.
- Servicios con precio, duración y categoría.
- Turnos con múltiples servicios y horarios calculados automáticamente.
- Control de solapamiento por peluquero.
- Estados: pendiente, confirmado, en proceso, completado, cancelado y no asistió.
- Historial de precios y duración al momento de agendar.
- Recordatorio por WhatsApp.
- Cobro del turno: genera una venta de servicios, permite elegir medio de pago y evita cobrar dos veces un turno ya cobrado. Si la venta se anula, el turno puede volver a cobrarse.

### Reportes

Rango de fechas con presets (hoy, últimos 7 días, este mes, mes anterior) y métricas de:

- Ventas completadas y anuladas.
- Ventas brutas, descuentos, ventas netas y ticket promedio.
- Ingresos por productos y servicios.
- Turnos completados, cancelados y ausentes.
- Productos y servicios más vendidos.
- Ventas por día.
- Medios de pago.
- Stock al costo, stock a la venta, stock bajo y sin stock.

Exportación a CSV y PDF. El PDF se genera localmente con una ventana oculta de Electron y `printToPDF`.

### Configuración

- Datos del local y moneda (ARS).
- Días y horarios de apertura.
- Intervalo de agenda.
- Días de aviso de vencimiento y vacunas.
- Plantilla de WhatsApp con placeholders.
- Estado, carpeta y retención de backups.
- Último backup realizado.
- Auditoría de las últimas 200 operaciones con búsqueda.

### Usuarios y permisos

- Creación de usuarios con rol.
- Edición de nombre, usuario, rol y estado.
- Activación y desactivación lógica.
- Restablecimiento de contraseña por administrador.
- Matriz de permisos configurable para vendedor y peluquero.

## Reglas de negocio

- Todos los importes se guardan en centavos para evitar errores de redondeo.
- Las fechas se guardan en formato ISO y los horarios en minutos desde las 00:00.
- Los registros con historial usan borrado lógico; no se eliminan físicamente.
- Toda venta se calcula y valida en el proceso principal.
- Las salidas de stock consumen primero los lotes más próximos a vencer (FEFO).
- Si un producto no tiene lote, se usa el lote genérico **Sin lote**.
- Una venta no puede dejar stock negativo.
- La anulación de venta solo la realiza un administrador y repone los lotes consumidos.
- No puede haber dos turnos superpuestos para el mismo peluquero.
- Los turnos guardan el nombre, precio y duración históricos de cada servicio.
- Solo se puede cobrar un turno completado.
- Un turno con venta anulada puede volver a cobrarse.
- La plantilla de WhatsApp reemplaza `{cliente}`, `{mascota}`, `{servicio}`/`{servicios}`, `{fecha}`, `{hora}` y `{negocio}`.
- Las acciones sensibles se registran en la auditoría.

## Datos y backups

### Ubicaciones

| Dato | Ruta |
| --- | --- |
| Base de datos | `%APPDATA%\VetGestión\veterinaria.db` |
| Fotos de mascotas | `%APPDATA%\VetGestión\fotos-mascotas\` |
| Backups por defecto | `Documentos\VetGestión\Backups\` |
| Exportaciones CSV/PDF | Ruta elegida por el usuario, por defecto `Documentos\` |
| Logs de Electron | `%APPDATA%\VetGestión\logs\` |

`%APPDATA%` corresponde normalmente a `C:\Users\<usuario>\AppData\Roaming`.

### Backups

- Se puede crear un backup manual desde **Configuración > Backups**.
- Si está activado, al iniciar la aplicación se crea como máximo un backup automático por día.
- La retención por defecto es de 30 copias; el rango permitido es 1 a 365.
- Cada backup es un archivo SQLite consistente generado con `db.backup`.
- La carpeta predeterminada se puede cambiar; si se deja vacía se usa `Documentos\VetGestión\Backups`.
- La lista muestra archivo, fecha y tamaño.

### Restauración

1. Ir a **Configuración > Backups**.
2. Elegir un backup y presionar **Restaurar**.
3. Confirmar la operación.

La aplicación crea automáticamente un backup de seguridad del estado actual antes de restaurar, cierra la base, copia el archivo elegido, reinicializa las migraciones y se reinicia. La restauración es exclusiva del administrador.

## Arquitectura

```text
src/
  main/                 Proceso principal de Electron
    db/                 Conexión, migraciones y datos iniciales
    ipc/                Handlers IPC y control de permisos
    services/           Lógica de negocio y acceso a SQLite
    photos.ts           Protocolo seguro para fotos de mascotas
    session.ts          Sesión en memoria
    index.ts            Ciclo de vida, ventana y seguridad
  preload/              Bridge IPC tipado y aislado
  renderer/             Interfaz React
    src/
      components/       Layout y componentes compartidos
      features/         Módulos por dominio
      lib/              API, autenticación, formato y navegación
      styles/           Estilos globales
  shared/               Contratos compartidos
    ipc.ts              Canales, tipos y API del bridge
    schemas.ts          Validaciones Zod
    types.ts            Tipos de dominio
    roles.ts            Roles, módulos y permisos
```

Flujo de una operación:

1. El renderer llama a `window.api.*` a través del preload.
2. El proceso principal valida sesión y permisos.
3. Zod valida el payload.
4. El servicio de negocio ejecuta la operación en SQLite.
5. Las operaciones críticas usan transacciones.
6. El bridge devuelve un resultado tipado `{ ok, data }` o `{ ok, error }`.

## Modelo de datos

- **Usuarios y permisos:** `users`, `role_permissions`.
- **Configuración y auditoría:** `settings`, `activity_log`, `schema_migrations`.
- **Clientes y mascotas:** `clients`, `pets`, `medical_records`.
- **Inventario:** `product_categories`, `products`, `product_batches`, `stock_movements`.
- **Ventas:** `sales`, `sale_items`, `sale_payments`, `sale_batch_allocations`.
- **Peluquería:** `services`, `groomers`, `appointments`, `appointment_services`.

Las migraciones son automáticas al iniciar. La base se inicializa con categorías, servicios, configuración y permisos por defecto la primera vez.

## Seguridad

- `contextIsolation: true`, `sandbox: true` y `nodeIntegration: false`.
- CSP restrictiva en producción.
- Validación Zod en todos los canales IPC.
- Comprobación de sesión y permisos en el proceso principal.
- Contraseñas con scrypt y salt; nunca se devuelven al renderer.
- Sesión en memoria, sin persistencia de tokens.
- Protocolo propio y validado para las fotos de mascotas.
- Enlaces externos limitados a `http`, `https`, `mailto` y `tel`.
- Ventanas nuevas y webviews bloqueadas.
- Permisos del navegador denegados.
- Instancia única de la aplicación.
- Registro local de errores con `electron-log`.
- Backups fuera de la base principal y restauración con copia de seguridad previa.

## Pruebas y verificación

### Unitarias e integración

```powershell
npm.cmd test
```

Estado actual: **12 archivos, 49 pruebas aprobadas**.

Cubren, entre otras cosas:

- Autenticación, hash y verificación de contraseñas.
- Permisos por rol.
- Clientes, mascotas e historial clínico.
- Inventario, FEFO, stock insuficiente y transacciones.
- Ventas, descuentos, anulación y reposición.
- Peluquería, solapamientos, estados y cobro.
- Reportes, configuración, auditoría y backups con retención.

### End-to-end

```powershell
npm.cmd run test:e2e
```

El flujo E2E crea una carpeta de datos temporal y verifica:

- Primer inicio y creación del administrador.
- Navegación completa.
- Clientes, mascotas y vacunas.
- Recordatorios en el panel.
- Inventario, categoría, producto, entrada con lote y vencimiento.
- Venta, historial y anulación con reposición.
- Peluquería: peluquero, servicio, turno, estados y cobro.
- Reportes, usuarios, permisos, configuración y auditoría.
- Cambio de contraseña y login.

### Aplicación empaquetada

Después de generar el instalador:

```powershell
npm.cmd run test:e2e:packaged
```

Esto ejecuta el mismo flujo contra `release/win-unpacked/VetGestión.exe`.

### Verificación antes de entregar

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run dist
npm.cmd run test:e2e:packaged
```

## Generar el instalador

```powershell
npm.cmd run dist
```

Resultado:

```text
release/
  VetGestion-Setup-1.0.0.exe
  VetGestion-Setup-1.0.0.exe.blockmap
  latest.yml
  win-unpacked/
```

La configuración de empaquetado está en `electron-builder.yml`:

- Aplicación x64.
- Instalador NSIS con selección de carpeta.
- Accesos directos en Inicio y escritorio.
- Icono propio en `build/icon.ico`.
- `better-sqlite3` desempaquetado del ASAR.
- `npmRebuild: false` porque el módulo usa binarios compatibles con Electron; esto evita requerir Python y Visual Studio Build Tools al empaquetar.

## Solución de problemas

### `npm` no se reconoce o PowerShell bloquea scripts

Usar `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

### Error al empaquetar `better-sqlite3`

El proyecto configura `npmRebuild: false` para evitar recompilaciones nativas. Si el binario instalado no funciona:

```powershell
npm.cmd rebuild better-sqlite3
```

Si se necesita recompilar desde código fuente, instalar Python 3, Visual Studio Build Tools con C++ y volver a ejecutar la instalación. Evitar rutas con espacios si node-gyp falla.

### La aplicación no abre la base de datos

Verificar permisos sobre `%APPDATA%\VetGestión\`. Restaurar un backup desde otra instalación o revisar el log en `%APPDATA%\VetGestión\logs\`.

### Windows SmartScreen advierte sobre el instalador

Es esperable porque el ejecutable no está firmado con un certificado comercial. Verificar que el archivo provenga de la compilación local y continuar.

### Se olvidó la contraseña del único administrador

No hay recuperación automática. Se puede restaurar un backup anterior desde un usuario administrador, o crear una base nueva moviendo `veterinaria.db` fuera de `%APPDATA%\VetGestión\` (se perderán los datos actuales).

## Limitaciones conocidas

- Diseñada para una sola computadora y una sola instancia; no sincroniza entre equipos.
- No incluye facturación fiscal ni integración con AFIP.
- La moneda está fijada en pesos argentinos (ARS).
- No hay recuperación de contraseña por correo.
- El instalador no está firmado digitalmente.
- Los horarios y días configurados se usan como referencia de agenda; la validación estricta de apertura por día no bloquea la creación de turnos fuera de esos horarios.
- WhatsApp abre la aplicación o el sitio externo mediante un enlace `wa.me`; no envía mensajes automáticamente.

## Licencia

Proyecto privado. Licencia **UNLICENSED**. Todos los derechos reservados.

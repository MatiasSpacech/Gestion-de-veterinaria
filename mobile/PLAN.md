# Plan de la aplicación Android

## Objetivo

Construir una aplicación Android de VetGestión para uso interno del local, offline y con datos locales, reutilizando la mayor cantidad posible del backend TypeScript de la aplicación de escritorio.

La nueva etapa vive en `mobile/` y no modifica la aplicación de escritorio existente.

## Decisiones aprobadas

- Plataforma: Android.
- Datos: independientes de la PC, sin sincronización en vivo.
- Formato: teléfono y tablet.
- Tecnología: Expo + React Native + TypeScript.
- Base de datos: SQLite mediante `expo-sqlite`, usando la API síncrona.
- Navegación: Expo Router.
- Componentes: React Native Paper con una interfaz táctil nueva.
- Alcance inicial: operación diaria del local.
- Distribución inicial: APK interno.
- Package ID: `com.vetgestion.mobile`.
- Versión móvil inicial: `1.0.0`.
- La interfaz Mantine existente no se reutiliza.
- La app de escritorio, su instalador y su base de datos no se tocan.

## Estrategia de reutilización

La app móvil importa desde el proyecto existente, en modo solamente lectura:

- `src/shared`: tipos, esquemas Zod, roles, errores y contratos.
- `src/main/db/migrations.ts`: mismo esquema y versiones.
- `src/main/db/seed.ts`: datos iniciales.
- `src/main/services`: lógica de negocio de clientes, mascotas, historial, inventario, ventas, peluquería, reportes, usuarios, configuración y auditoría.
- `buildReportHtml` y `buildReportCsv` para etapas posteriores.
- Formatos, etiquetas y paleta de colores.

No se reutilizan:

- Mantine ni las pantallas del escritorio.
- Los handlers IPC de Electron.
- `src/main/db/connection.ts`, que depende de `better-sqlite3`.
- `src/main/services/backups.ts`, que usa `node:fs` y `node:path`.
- `node:crypto` directo: en la app se resuelve con `src/shims/node-crypto.ts`, respaldado por el
  módulo nativo `modules/scrypt` (Kotlin), que reproduce los hashes del escritorio.

Los servicios de negocio solo usan una interfaz compatible con `prepare().get/all/run`, `exec()` y `transaction()`. La app móvil implementa esa interfaz sobre `expo-sqlite`.

## Estructura prevista

```text
mobile/
  app/                         # Rutas de Expo Router (Fase 1)
  modules/
    scrypt/                    # Módulo nativo de Expo (Kotlin): scrypt y aleatoriedad
  scripts/
    dev-android.ps1            # Emulador + Metro + build + install + launch
  src/
    components/                # Componentes táctiles compartidos (Fase 1)
    features/                  # Pantallas por módulo (Fase 3)
    data/
      db.ts                    # Adaptador expo-sqlite
      password.ts              # Hash de contraseñas compatible con el escritorio
      controllers/             # Sesión, permisos, Zod y auditoría (Fase 2)
      backups.ts               # Backups móviles (Fase 2)
    shims/
      node-crypto.ts           # Shim de node:crypto sobre modules/scrypt
    spike/
      phase0.ts                # Autodiagnóstico de la Fase 0
    lib/
    theme/
  assets/
  android/                     # Generado por Expo prebuild
  app.json
  package.json
  tsconfig.json
  metro.config.js
  eslint.config.mjs
  .gitignore
  README.md
  PLAN.md
  RESULTS_FASE_0.md
```

## Aislamiento

- Todo el código nuevo vive en `mobile/`.
- `mobile/` tiene su propio `package.json`, lockfile, configuración y tests.
- No se agregan workspaces ni dependencias al `package.json` raíz.
- La app móvil importa archivos del escritorio sin modificarlos.
- El único cambio previsto fuera de `mobile/` es agregar `mobile/**` a los ignores de ESLint para que el lint del escritorio no procese el proyecto móvil.
- Los scripts y artefactos del escritorio no se modifican.

## Entorno de desarrollo

- Windows.
- Node.js 24.14.0.
- npm 11.9.0.
- Java 21 en `C:\Program Files\Eclipse Adoptium\jdk-21.0.3.9-hotspot`.
- Android Studio instalado.
- Android SDK en `C:\AndroidSdk`.
- `adb` 37.0.1.
- AVD existente: `Medium_Phone_API_37.0`.
- Plataforma instalada: `android-37.0`.
- Build tools instalados: `36.0.0`.
- Licencia de Android SDK aceptada.
- `ANDROID_HOME` y `ANDROID_SDK_ROOT` no están definidos globalmente; se configurarán por sesión y con `local.properties`.
- `cmdline-tools` no está instalado; se puede agregar desde Android Studio si hace falta.
- Se usará JDK 21 para Gradle, no el JBR 25 incluido con Android Studio.

## Experiencia táctil

- Navegación inferior: Inicio, Agenda, Vender, Clientes y Más.
- En tablet: barra lateral y vistas de dos paneles cuando aporten valor.
- Teléfono: una columna, tarjetas, bottom sheets y formularios a pantalla completa.
- Objetivos táctiles de al menos 48 dp.
- Sin tablas densas ni acciones dependientes de hover.
- POS con búsqueda grande, lector de código de barras, carrito fijo, descuentos, medios de pago y cálculo de vuelto.
- Agenda diaria en teléfono y semanal en tablet.
- Acciones rápidas para llamar, enviar WhatsApp, cobrar y cambiar estados.
- Bloqueo de la app al pasar a segundo plano, con biometría o contraseña.

## Alcance de la primera versión

Incluye:

- Primer inicio, login, logout y cambio de contraseña.
- Panel con ventas, turnos, stock bajo y vacunas próximas.
- Clientes, mascotas, historial clínico, vacunas, peso y fotos.
- Inventario, lotes, vencimientos, entradas, ajustes y movimientos.
- Ventas, pagos, anulación por administrador e historial.
- Peluquería: servicios, peluqueros, agenda, turnos, estados y cobro.
- Usuarios básicos y roles.
- Configuración del negocio y plantilla de WhatsApp.
- Backups manuales, automáticos y restauración.
- Importación de backups de escritorio.
- Cámara, código de barras, notificaciones locales, PDF/CSV y WhatsApp.

Queda para una segunda entrega:

- Reportes completos con gráficos.
- Matriz visual avanzada de permisos.
- Auditoría navegable.
- Impresión Bluetooth de recibos.
- Sincronización entre dispositivos.

## Datos y portabilidad

- Base `veterinaria.db` con el mismo esquema y migraciones.
- Backups consistentes mediante la API de `expo-sqlite`.
- Nombres de backup compatibles con el escritorio.
- Importación de backups de escritorio con validación de integridad y versión.
- Backup de seguridad antes de restaurar.
- Las fotos no forman parte del `.db`; se evaluará un ZIP portable en una etapa posterior.
- No hay sincronización en vivo. El esquema actual usa IDs enteros y no tiene registro de cambios ni resolución de conflictos.

## Seguridad

- Sesión en memoria.
- Contraseñas con hashes scrypt compatibles con el escritorio.
- Verificación contra hashes generados por la app de PC.
- Base y fotos en almacenamiento privado de la app.
- Backup automático de Android desactivado para evitar copias no controladas.
- Bloqueo por inactividad.
- Sin servidor ni conexión obligatoria a internet.
- Sin registrar datos sensibles en logs.

## Fases

### Fase 0: viabilidad — completada el 21/10/2026

Resultado y mediciones en `RESULTS_FASE_0.md`.

- Crear el proyecto Expo aislado. — Hecho
- Configurar Metro y TypeScript para importar el código compartido. — Hecho
- Implementar el adaptador `expo-sqlite`. — Hecho
- Implementar el shim de `node:crypto`. — Hecho
- Ejecutar migraciones y seed existentes. — Hecho
- Probar setup de administrador, login, alta de producto, entrada de stock, venta y anulación. — Hecho
- Verificar persistencia al reiniciar. — Hecho
- Compilar y ejecutar en el emulador Android. — Hecho
- Documentar resultados. — Hecho

Criterio de aceptación: cumplido. La app abre, ejecuta el circuito completo y muestra un resultado
exitoso, con typecheck y tests aprobados.

El riesgo del scrypt quedó resuelto en esta fase con el módulo nativo `modules/scrypt`: la derivación
tarda 395 ms en el emulador (contra 5,1 a 5,9 segundos en JavaScript) y los hashes coinciden con los
del escritorio, verificado por un test JVM contra el mismo vector de Node.

### Fase 1: base móvil — completada el 22/10/2026

Resultados y capturas en `RESULTS_PHASE_1.md`.

- Expo Router. — Hecho
- Tema y componentes táctiles. — Hecho
- Layout para teléfono y tablet. — Hecho
- Lint, tests y scripts propios. — Hecho
- AVD de tablet. — Hecho
- Development build. — Hecho

Criterio de aceptación: cumplido. La app abre en el development build, inicia sesión con un
usuario real de la base local y muestra la navegación inferior en teléfono y la barra lateral en
tablet, con typecheck, lint y tests aprobados.

La app semonte con Expo Router sobre un grupo de pestañas con las cinco secciones acordadas
(Inicio, Agenda, Vender, Clientes y Más), React Native Paper con el tema verde del escritorio y
objetivos táctiles de 48 dp. El development build usa `expo-dev-client` para recargar el código
sin recompilar.

### Fase 2: capa de datos — completada el 22/10/2026

Resultados en `RESULTS_PHASE_2.md`.

- Adaptador definitivo. — Hecho
- Controladores con sesión, permisos, Zod y auditoría. — Hecho
- Autenticación. — Hecho
- Backups móviles. — Hecho
- Pruebas de compatibilidad con el escritorio. — Hecho

Criterio de aceptación: cumplido. La app pide usuario y contraseña, valida con los esquemas Zod
del escritorio, aplica los permisos del rol, deja rastro en la auditoría y permite crear, listar,
restaurar y borrar backups de la base local con el mismo formato de archivo que la app de
escritorio.

Los controladores viven en `mobile/src/data/controllers` y reciben la base como argumento, con
`mobile/src/data/testing/database.ts` como adaptador de pruebas sobre `node:sqlite`. Los backups
usan el backup online de `expo-sqlite` y la carpeta privada de la app.

### Fase 3: operación diaria

- Panel.
- Clientes, mascotas e historial.
- Inventario.
- Ventas.
- Peluquería.

### Fase 4: administración e integraciones

- Usuarios y configuración.
- Cámara y códigos de barras.
- Notificaciones locales.
- WhatsApp, PDF/CSV y compartición.
- Bloqueo biométrico.

### Fase 5: calidad y entrega

- Importación de backups de escritorio.
- Pruebas E2E con Maestro.
- APK firmado.
- Documentación final.

## Pruebas

- Los 49 tests actuales siguen protegiendo el backend del escritorio.
- Tests del adaptador SQLite.
- Tests de compatibilidad de scrypt en Vitest.
- Test JVM del módulo nativo `scrypt` contra el mismo vector de Node.
- Tests de los controladores móviles con un adaptador de pruebas.
- React Native Testing Library para componentes críticos.
- Maestro para los flujos E2E en Android.
- Verificación separada de typecheck, lint, tests y build Android.

## Riesgos

- Los servicios del escritorio pueden cambiar y romper la app móvil. Se agregará una prueba de compatibilidad.
- Scrypt nativo propio: el módulo en Kotlin se mantiene a cargo del proyecto y debe verificarse contra los vectores de Node al cambiar. Medido en la Fase 0: 395 ms en el emulador contra 5,1 a 5,9 segundos del scrypt en JavaScript. `react-native-quick-crypto` se descartó porque su compilación CMake falla en Windows cuando la ruta del proyecto supera los 260 caracteres.
- `expo-sqlite` síncrono bloquea el hilo de JavaScript en consultas pesadas. Los reportes se diseñarán con cuidado.
- Los backups de Android y el acceso a carpetas requieren usar las APIs de almacenamiento.
- Las fotos no están incluidas en el backup de base de datos.
- La importación de datos de escritorio debe validar versión de esquema.
- La compilación nativa de React Native genera rutas de codegen de más de 260 caracteres en esta carpeta del proyecto. Resuelto en la Fase 1 habilitando las rutas largas de Windows y usando ninja 1.12; ver `mobile/scripts/setup-android.ps1`.
- `react-native-reanimated` y `react-native-worklets` se instalan como pares opcionales de `expo-router` y compilan con CMake. La app no los usa, así que `mobile/.npmrc` los omite con `omit=peer` y evita ese build.

## Supuestos

- La app Android reemplaza el uso de la PC en el local o funciona como dispositivo independiente.
- No se requiere compartir datos en vivo con el escritorio.
- La distribución inicial es por APK interno.
- No se necesita Play Store en la primera entrega.
- El lector de código de barras y la cámara se incluyen en la primera versión.

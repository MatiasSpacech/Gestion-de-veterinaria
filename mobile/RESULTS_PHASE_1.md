# Resultados de la Fase 1: base móvil

Fecha de ejecución: 22/10/2026.

## Entorno usado

- Emulador de teléfono: `Medium_Phone_API_37.0` (Android 17, API 37, x86_64).
- Tablet: se verificó el layout de tablet con el mismo emulador redimensionado a 1280x800 con
  densidad 160 (1280 dp de ancho). El AVD `Vetgestion_Tablet_API_37.0` queda creado para las
  pruebas siguientes.
- JDK: Eclipse Adoptium 21.0.3.9-hotspot. Gradle 9.4.1. Android SDK en `C:\AndroidSdk`.
- App: `com.vetgestion.mobile` versión `1.0.0` (versionCode 1), Expo SDK 58, React Native 0.88,
  motor Hermes, development build con `expo-dev-client`.

## Qué se verificó

| Punto del plan | Estado | Evidencia |
| --- | --- | --- |
| Expo Router | OK | `mobile/app` con `(tabs)`, `login`, `setup`, `diagnostico` y `+not-found` |
| Tema y componentes táctiles | OK | `mobile/src/theme` y `mobile/src/components` con `Screen`, `AppButton`, `AppTextInput`, `ListRow`, `MetricCard`, `EmptyState` |
| Layout para teléfono y tablet | OK | Barra inferior en teléfono y barra lateral en tablet, con ancho máximo de contenido |
| Lint, tests y scripts propios | OK | `npm run typecheck`, `npm run lint` y `npm test` en verde, con `vitest.config.mts` |
| AVD de tablet | OK | `Vetgestion_Tablet_API_37.0` (1280x800) |
| Development build | OK | APK con `expo-dev-client` instalado y recargando desde Metro |

## Navegación verificada en el emulador

1. La app abre y, como la base local ya tiene el usuario de la Fase 0, muestra la pantalla de
   inicio de sesión.
2. Con el usuario `fase0` se entra y se llega al panel de Inicio con las cuatro métricas.
3. La barra inferior muestra Inicio, Agenda, Vender, Clientes y Más.
4. En Más aparecen los datos de la sesión, el cierre de sesión y las secciones de administración
   y herramientas todavía bloqueadas para las fases siguientes.
5. En tablet (1280 dp de ancho) la barra pasa a ser lateral y el panel muestra cuatro tarjetas
   por fila.

## Verificaciones automáticas

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` en `mobile/` | OK, sin errores |
| `npm run lint` en `mobile/` | OK, sin errores |
| `npm test` en `mobile/` | 21 tests aprobados (layout, scrypt, sesión, permisos, auditoría y validación) |

## Problema resuelto: rutas de más de 260 caracteres

Al agregar Expo Router, React Native compila el código generado de `react-native-screens` y de
`react-native-safe-area-context`. Las rutas resultantes superan el límite de 260 caracteres de
Windows en esta carpeta del proyecto:

```text
android\app\.cxx\Debug\<hash>\arm64-v8a\safeareacontext_autolinked_build\CMakeFiles\
react_codegen_safeareacontext.dir\C_/Users/.../react-native-safe-area-context/android/build/
generated/source/codegen/jni/react/renderer/components/safeareacontext/ComponentDescriptors.cpp.o
```

El error era `ninja: error: Stat(...): Filename longer than 260 characters`.

Solución aplicada:

1. Windows con rutas largas habilitadas:
   `reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f`
   (requiere una consola de administrador). Ninja solo usa el prefijo `\\?\` cuando el sistema
   informa que están habilitadas.
2. Ninja 1.12.1, que sí soporta rutas largas, en una copia del CMake del SDK:
   `C:\AndroidSdk\cmake\3.22.1-lgpaths`. La copia evita modificar el SDK instalado.
3. `mobile/scripts/setup-android.ps1` deja todo preparado: verifica el registro, descarga ninja si
   hace falta y escribe `android/local.properties` con `sdk.dir` y `cmake.dir`.

Con eso, el mismo build que fallaba terminó en 1 minuto y 31 segundos.

## Segundo problema resuelto: pares opcionales que compilan con CMake

`expo-router` declara `react-native-reanimated` y `react-native-worklets` como pares opcionales y
npm los instalaba igual. Los dos compilan con CMake y agregaban otro build nativo largo que la
app no usa. `mobile/.npmrc` los omite con `omit=peer`:

```ini
omit=peer
```

Después de `npm install` quedan 24 paquetes menos y el build nativo ya no los incluye.

## Decisiones de la fase

- La navegación inferior sigue el orden acordado: Inicio, Agenda, Vender, Clientes y Más.
- En tablet la barra pasa a lateral y el contenido se limita a 1040 dp de ancho.
- El kit de componentes táctiles fija 48 dp como alto mínimo de botones e inputs, que es el
  objetivo acordado para el uso con el dedo.
- La sesión es solo en memoria: al cerrar la app hay que volver a iniciar sesión.
- El build de desarrollo se limita a `x86_64` por defecto para acelerar la compilación en el
  emulador. Para el APK de distribución hay que compilar con
  `-Architectures armeabi-v7a,arm64-v8a,x86,x86_64`.

## Próximos pasos

1. Completar la Fase 2: backups móviles y prueba de compatibilidad con el escritorio.
2. Empezar la Fase 3 con el panel real (ventas del día, turnos, stock bajo y vacunas próximas).

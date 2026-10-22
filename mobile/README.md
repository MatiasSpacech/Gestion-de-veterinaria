# VetGestión Mobile

Aplicación Android de VetGestión para uso interno del local. Es un proyecto independiente: tiene su
propio `package.json`, su propio lockfile y no modifica la app de escritorio.

El plan completo está en [PLAN.md](./PLAN.md). Los resultados están en
[RESULTS_PHASE_0.md](./RESULTS_PHASE_0.md) y [RESULTS_PHASE_1.md](./RESULTS_PHASE_1.md).

## Requisitos

- Node.js 24 y npm 11.
- JDK 21 (Eclipse Adoptium). Gradle usa ese JDK, no el JBR de Android Studio.
- Android SDK en `C:\AndroidSdk` con la plataforma `android-37.0`, build tools `36.0.0` y un AVD
  (`Medium_Phone_API_37.0` y `Vetgestion_Tablet_API_37.0`).
- Windows con rutas largas habilitadas (ver "Rutas largas de Windows").

## Instalación

```powershell
cd mobile
npm install
```

`mobile/.npmrc` deja `omit=peer` para que npm no instale `react-native-reanimated` ni
`react-native-worklets`: son pares opcionales de `expo-router`, la app no los usa y los dos compilan
con CMake, que es el build nativo más lento de este proyecto.

## Verificaciones

```powershell
npm run typecheck
npm run lint
npm test
```

Prueba del módulo nativo de scrypt (requiere `android/` generado y `local.properties`):

```powershell
cd android
.\gradlew.bat :scrypt:testDebugUnitTest
```

## Ejecutar en el emulador

El flujo directo (`npx expo run:android`) deja la terminal ocupada, porque Metro queda en primer
plano. Para trabajar sin que la terminal se quede tildada, usá el script, que hace todo en segundo
plano:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-android.ps1
```

Qué hace el script:

1. Levanta el emulador si no hay ningún dispositivo conectado en `adb` y espera que termine de
   arrancar.
2. Inicia Metro en segundo plano si el puerto 8081 está libre. Log en `mobile/.metro/metro.log`.
3. Genera `mobile/android/` con `expo prebuild` si falta, prepara el entorno de build y compila el
   APK de debug.
4. Instala el APK, configura `adb reverse tcp:8081 tcp:8081` y abre la app en el development build.

Opciones útiles:

- `-SkipBuild`: no compila, usa el APK existente.
- `-SkipMetro`: no levanta Metro.
- `-SkipInstall`: no reinstala el APK.
- `-Avd Vetgestion_Tablet_API_37.0`: usa el emulador de tablet.
- `-Architectures armeabi-v7a,arm64-v8a,x86,x86_64`: compila para todas las arquitecturas en vez de
  solo `x86_64`, que es el valor por defecto para acelerar el build en el emulador.

### Rutas largas de Windows

La compilación nativa de React Native genera rutas de codegen de más de 260 caracteres en esta
carpeta del proyecto, y ninja las rechaza. Hay que habilitar las rutas largas de Windows una sola
vez, desde una consola de administrador:

```powershell
reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1 /f
```

Además, ninja 1.10.2 (el que trae el CMake del SDK) no las soporta. `mobile/scripts/setup-android.ps1`
deja una copia del CMake con ninja 1.12.1 en `C:\AndroidSdk\cmake\3.22.1-lgpaths` y la selecciona
desde `android/local.properties`. El script avisa si falta cualquiera de las dos cosas.

Para ver la app en una ventana aparte:

```powershell
& "C:\AndroidSdk\emulator\emulator.exe" -avd Medium_Phone_API_37.0
```

Capturas y logs del dispositivo:

```powershell
& "C:\AndroidSdk\platform-tools\adb.exe" shell screencap -p /sdcard/fase1.png
& "C:\AndroidSdk\platform-tools\adb.exe" pull /sdcard/fase1.png $env:TEMP\fase1.png
& "C:\AndroidSdk\platform-tools\adb.exe" logcat
```

## Cómo se reutiliza el código del escritorio

- `@shared/*` apunta a `../src/shared` (tipos, esquemas Zod, roles y errores).
- `@desktop/*` apunta a `../src/main` (migraciones, seed y servicios de negocio).
- El import `node:crypto` se resuelve con `src/shims/node-crypto.ts`, que implementa `randomBytes`,
  `randomUUID`, `scryptSync` y `timingSafeEqual` sobre el módulo nativo `modules/scrypt` (Kotlin,
  RFC 7914). En Node real (tests) se usa el `node:crypto` nativo del escritorio.

El alias `@shared` y `@desktop` está configurado en los tres lados: `metro.config.js` para el
empaquetado, `tsconfig.json` para el typecheck y `vitest.config.mts` para los tests.

## Módulo nativo de scrypt

`modules/scrypt` es un módulo local de Expo escrito en Kotlin, sin NDK. Expone:

- `deriveKeyHex(passwordHex, saltHex, keyLength)`: derivación scrypt con los parámetros del escritorio
  (`N=16384`, `r=8`, `p=1`).
- `randomBytesHex(size)` y `randomUUID()`: aleatoriedad para el shim de `node:crypto`.

Se validó contra el mismo vector que usa Node en `android/src/test/.../ScryptTest.kt`. En el emulador
la derivación tarda unos 395 ms, contra 5,1 a 5,9 segundos de la versión JavaScript en Hermes.

## Estructura

```text
mobile/
  app/                         # Rutas de Expo Router
    (tabs)/                    # Inicio, Agenda, Vender, Clientes y Más
    login.tsx                  # Inicio de sesión
    setup.tsx                  # Primer inicio: creación del administrador
    diagnostico.tsx            # Autodiagnóstico de la Fase 0
  modules/scrypt/              # Módulo nativo de Expo (Kotlin) para node:crypto
  scripts/dev-android.ps1      # Emulador + Metro + build + install + launch
  scripts/setup-android.ps1    # Rutas largas, ninja y local.properties
  src/
    components/                # Componentes táctiles compartidos
    data/
      db.ts                    # Adaptador expo-sqlite
      password.ts              # Hash de contraseñas compatible con el escritorio
      controllers/             # Sesión, permisos, validación y auditoría
      testing/database.ts      # Adaptador de pruebas sobre node:sqlite
    shims/node-crypto.ts       # Shim de node:crypto sobre modules/scrypt
    spike/phase0.ts            # Autodiagnóstico de la Fase 0
    theme/                     # Tema, tokens y layout responsivo
  assets/
  app.json
  metro.config.js
  tsconfig.json
  vitest.config.mts
```

## Estado actual

Fase 1 completada: navegación con Expo Router, tema de React Native Paper con la paleta verde del
escritorio, kit de componentes táctiles de 48 dp, layout de teléfono con barra inferior y de tablet
con barra lateral, development build con `expo-dev-client` y AVD de tablet.

Fase 2 en curso: sesión en memoria, permisos por rol, validación con los esquemas Zod del
escritorio, auditoría de actividad, pantallas de primer inicio, login y logout, y tests de los
controladores sobre `node:sqlite`.

Detalles y mediciones en [RESULTS_PHASE_0.md](./RESULTS_PHASE_0.md) y
[RESULTS_PHASE_1.md](./RESULTS_PHASE_1.md).

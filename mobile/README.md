# VetGestión Mobile

Aplicación Android de VetGestión para uso interno del local. Es un proyecto independiente: tiene su
propio `package.json`, su propio lockfile y no modifica la app de escritorio.

El plan completo está en [PLAN.md](./PLAN.md) y los resultados de la Fase 0 en
[RESULTS_FASE_0.md](./RESULTS_FASE_0.md).

## Requisitos

- Node.js 24 y npm 11.
- JDK 21 (Eclipse Adoptium). Gradle usa ese JDK, no el JBR de Android Studio.
- Android SDK en `C:\AndroidSdk` con la plataforma `android-37.0`, build tools `36.0.0` y un AVD
  (`Medium_Phone_API_37.0`).
- `ANDROID_HOME` y `ANDROID_SDK_ROOT` configurados por sesión o en `mobile/android/local.properties`
  (el archivo se genera con `sdk.dir`).

## Instalación

```powershell
cd mobile
npm install
```

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
3. Genera `mobile/android/` con `expo prebuild` si falta y compila el APK de debug.
4. Instala el APK, configura `adb reverse tcp:8081 tcp:8081` y abre la app.

Opciones útiles:

- `-SkipBuild`: no compila, usa el APK existente.
- `-SkipMetro`: no levanta Metro.
- `-SkipInstall`: no reinstala el APK.

Para ver la app en una ventana aparte:

```powershell
& "C:\AndroidSdk\emulator\emulator.exe" -avd Medium_Phone_API_37.0
```

Capturas y logs del dispositivo:

```powershell
& "C:\AndroidSdk\platform-tools\adb.exe" shell screencap -p /sdcard/fase0.png
& "C:\AndroidSdk\platform-tools\adb.exe" pull /sdcard/fase0.png $env:TEMP\fase0.png
& "C:\AndroidSdk\platform-tools\adb.exe" logcat
```

## Cómo se reutiliza el código del escritorio

- `@shared/*` apunta a `../src/shared` (tipos, esquemas Zod, roles y errores).
- `@desktop/*` apunta a `../src/main` (migraciones, seed y servicios de negocio).
- El import `node:crypto` se resuelve con `src/shims/node-crypto.ts`, que implementa `randomBytes`,
  `randomUUID`, `scryptSync` y `timingSafeEqual` sobre el módulo nativo `modules/scrypt` (Kotlin,
  RFC 7914). En Node real (tests) se usa el `node:crypto` nativo del escritorio.

El alias `@shared` y `@desktop` está configurado en los dos lados: `metro.config.js` para el
empaquetado y `tsconfig.json` para el typecheck.

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
  modules/scrypt/            # Módulo nativo de Expo (Kotlin) para node:crypto
  scripts/dev-android.ps1    # Emulador + Metro + build + install + launch
  src/
    data/db.ts               # Adaptador expo-sqlite
    data/password.ts         # Hash de contraseñas compatible con el escritorio
    shims/node-crypto.ts     # Shim de node:crypto sobre modules/scrypt
    spike/phase0.ts          # Autodiagnóstico de la Fase 0
  assets/
  app.json
  metro.config.js
  tsconfig.json
```

## Estado actual

Fase 0 completada: la app abre en el emulador, ejecuta migraciones, seed, autenticación, inventario,
venta y anulación con los servicios reales del escritorio, conserva los datos al reiniciar y usa un
scrypt nativo compatible con el escritorio. Detalles y mediciones en
[RESULTS_FASE_0.md](./RESULTS_FASE_0.md).

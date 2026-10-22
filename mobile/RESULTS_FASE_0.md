# Resultados de la Fase 0: viabilidad

Fecha de ejecución: 21/10/2026.

## Entorno usado

- Emulador: `Medium_Phone_API_37.0` (Android 17, API 37, x86_64).
- JDK: Eclipse Adoptium 21.0.3.9-hotspot. Gradle 9.4.1. Android SDK en `C:\AndroidSdk`.
- App: `com.vetgestion.mobile` versión `1.0.0` (versionCode 1), Expo SDK 58, React Native 0.88, motor Hermes.
- APK de prueba: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
- La carpeta `mobile/android/` es generada por `expo prebuild` y no se versiona.

## Qué se verificó

| Punto del plan | Estado | Evidencia |
| --- | --- | --- |
| Proyecto Expo aislado | OK | `mobile/` con su propio `package.json`, lockfile, `tsconfig`, `eslint.config.mjs` y `.gitignore` |
| Metro y TypeScript para importar el código del escritorio | OK | Alias `@shared` y `@desktop` en `mobile/metro.config.js` y `mobile/tsconfig.json`; 771 módulos empaquetados |
| Adaptador `expo-sqlite` | OK | `mobile/src/data/db.ts` expone `prepare().get/all/run`, `exec()` y `transaction()` |
| Shim de `node:crypto` | OK | `mobile/src/shims/node-crypto.ts`, respaldado por el módulo nativo `Scrypt` (Kotlin) |
| Migraciones y seed existentes | OK | 1 migración aplicada y 16 configuraciones cargadas |
| Setup de administrador, login, alta de producto, entrada de stock, venta y anulación | OK | Circuito completo en el emulador, todos los pasos en estado `OK` |
| Persistencia al reiniciar | OK | Datos y contador de ventas conservados entre reinicios de la app |
| Compilar y ejecutar en el emulador Android | OK | APK compilado con Gradle y ejecutado en `emulator-5554` |
| Documentar resultados | OK | Este documento |

## Circuito ejecutado en el emulador

Tiempos de una corrida con la base ya inicializada y el scrypt nativo:

| Paso | Resultado | Tiempo |
| --- | --- | --- |
| Hash de contraseñas compatible con el escritorio | scrypt nativo en 395 ms | 395 ms |
| Esquema y datos iniciales | 1 migración y 16 configuraciones | 2 ms |
| Usuario administrador e inicio de sesión | Administrador Fase 0 (@fase0) con rol admin | 361 ms |
| Producto de inventario | ID 1, stock 5 | 1 ms |
| Entrada de stock | Stock disponible: 5 | 0 ms |
| Venta | V-000013 por 150000 centavos | 12 ms |
| Anulación de venta | V-000013 anulada y stock restituido a 5 | 8 ms |
| Persistencia local | 1 usuario, 1 producto y 13 ventas | 1 ms |

Duración total de la corrida: 780 ms. Antes del scrypt nativo la misma corrida tardaba 5214 ms.

## Persistencia al reiniciar

1. Primera corrida: crea el administrador `@fase0`, el producto `FASE0-001` con stock 5, registra
   5 unidades, vende una unidad y anula la venta restituyendo el stock a 5.
2. `am force-stop com.vetgestion.mobile` y nueva apertura de la app.
3. Segunda corrida: el setup de administrador se omite porque la base ya tiene usuarios, se reutiliza
   el mismo producto (ID 1, stock 5) y el numerador de ventas sigue correlativo (V-000006).
4. Tercera corrida con el botón "Volver a ejecutar": V-000007 y stock otra vez en 5.
5. Tras recompilar e instalar el APK con el módulo nativo, los datos siguieron intactos y el contador
   continuó hasta V-000013.

El contador de ventas siguió aumentando y el stock volvió al valor inicial en cada vuelta, lo que
confirma que la base local sobrevive al cierre de la app y que las transacciones del escritorio
(funcionamiento de `transaction()` con `BEGIN IMMEDIATE` y `ROLLBACK`) se comportan bien sobre
`expo-sqlite`.

## Verificaciones automáticas

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` en `mobile/` | OK, sin errores |
| `npm run lint` en `mobile/` | OK, sin errores |
| `npm test` en `mobile/` | 4 tests aprobados (compatibilidad de scrypt) |
| `gradlew :scrypt:testDebugUnitTest` | 2 tests aprobados (scrypt nativo contra vectores de Node) |
| `npm run typecheck` en la raíz | OK, sin errores |
| `npm run lint` en la raíz | OK, sin errores |
| `npm test` en la raíz | 49 tests aprobados |

## Hallazgo y solución: el scrypt en JavaScript es demasiado lento en el dispositivo

Mediciones con los mismos parámetros que usa el escritorio (`N=16384`, `r=8`, `p=1`, clave de 64 bytes):

| Runtime | Implementación | Tiempo por derivación |
| --- | --- | --- |
| Node 24 (escritorio) | `node:crypto` nativo | 28 ms |
| Node 24 | `@noble/hashes` (JavaScript) | 50 ms |
| Android emulador (Hermes) | `@noble/hashes` (JavaScript) | 5100 a 5900 ms |
| JVM (test del módulo) | scrypt nativo (Kotlin) | 91 ms |
| Android emulador | scrypt nativo (Kotlin) | 395 ms |

En el emulador el scrypt en JavaScript es entre 100 y 180 veces más lento que el nativo del
escritorio. El paso de login tardaba más de 5 segundos, lo que no es aceptable para el uso diario del
local y confirma el riesgo que el plan había anotado.

La diferencia no está en el algoritmo: el mismo código de `@noble/hashes` tarda 50 ms en V8 y 5200 ms
en Hermes. La causa es el motor de JavaScript, por lo que la corrección tenía que ser nativa.

Alternativas evaluadas:

- `react-native-quick-crypto`: expone `node:crypto` con `scryptSync` nativo, pero su compilación CMake
  falla en Windows porque la ruta del proyecto supera el límite de 260 caracteres
  (`ninja: error: mkdir(CMakeFiles/NitroModules.dir/C_/Users/...)`). Se descartó junto con
  `react-native-nitro-modules` y `react-native-quick-base64`.
- Módulo nativo propio de Expo con scrypt en Kotlin: **solución adoptada**. Vive en
  `mobile/modules/scrypt`, implementa RFC 7914 sin NDK y expone `deriveKeyHex`, `randomBytesHex` y
  `randomUUID`. `mobile/src/shims/node-crypto.ts` lo usa para respaldar el import `node:crypto` que ya
  hacen los servicios del escritorio.
- Mantener el shim en JavaScript y aceptar el costo: descartado, bloqueaba el login.

El módulo se valida con un test JVM contra el mismo vector que usa Node (`clave-segura` /
`0123456789abcdef`), de modo que los hashes móviles son idénticos a los del escritorio. Durante el
desarrollo el test detectó un error en el reordenamiento de `BlockMix` respecto de RFC 7914; se
corrigió y la verificación quedó en verde.

Con el módulo nativo el paso de hash tarda 395 ms y el login completo 361 ms en el emulador, contra
5197 ms antes.

## Estado de la terminal y flujo de trabajo

`npx expo run:android` deja la terminal ocupada porque levanta Metro en primer plano y espera al
emulador. Para evitar que la terminal quede tildada, el proyecto incluye
`mobile/scripts/dev-android.ps1`, que hace todo en segundo plano y con logs en archivos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-android.ps1
```

El script levanta el emulador si no está corriendo, espera el arranque, inicia Metro en segundo
plano con log en `mobile/.metro/metro.log`, genera `android/local.properties` con `sdk.dir` si falta,
compila el APK si falta, lo instala, configura `adb reverse tcp:8081 tcp:8081` y abre la app.

## Próximos pasos

1. Arrancar la Fase 1: Expo Router, tema, React Native Paper y layout para teléfono y tablet.
2. Mantener el test JVM del módulo `scrypt` en la verificación habitual y ampliar los vectores de
   compatibilidad con el escritorio.

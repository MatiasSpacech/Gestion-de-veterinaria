# Resultados de la Fase 4: administración e integraciones

Fecha de ejecución: 22/10/2026.

## Qué se verificó

| Punto del plan | Estado | Evidencia |
| --- | --- | --- |
| Usuarios y configuración | OK | `mobile/src/features/users`, `mobile/src/features/settings`, `mobile/app/usuarios.tsx` y `mobile/app/configuracion.tsx` |
| Cámara y códigos de barras | OK | `mobile/src/components/BarcodeScannerModal.tsx`, `mobile/src/data/pet-photos.ts`, `mobile/app/(tabs)/vender.tsx` y `mobile/app/inventario.tsx` |
| Notificaciones locales | OK | `mobile/src/data/notifications.ts`, `mobile/src/data/notifications-policy.ts`, `mobile/app/(tabs)/agenda.tsx` y `mobile/app/turnos/nuevo.tsx` |
| WhatsApp, PDF/CSV y compartición | OK | `mobile/src/lib/whatsapp.ts`, `mobile/src/features/reports`, `mobile/src/data/report-files.ts` y `mobile/app/reportes.tsx` |
| Bloqueo biométrico | OK | `mobile/src/data/lock.ts`, `mobile/src/components/LockScreen.tsx` y `mobile/src/data/session-provider.tsx` |

## Cómo está armado

- Los servicios de administración y reportes siguen el patrón de la Fase 3: reciben la base como
  argumento opcional, validan con Zod, exigen el permiso del rol y registran auditoría.
- `mobile/src/features/users` reutiliza los servicios de usuarios del escritorio y agrega el alta,
  la edición de rol/estado y el cambio de contraseña.
- `mobile/src/features/settings` guarda la configuración del negocio y la preferencia local
  `mobile.notifications.appointments`.
- `mobile/src/data/notifications.ts` importa `expo-notifications` de forma dinámica para que los
  tests sigan corriendo en Node. Usa el canal `turnos` y programa el recordatorio una hora antes.
- `mobile/src/data/pet-photos.ts` guarda las fotos en la carpeta privada `photos` de la app. La
  base conserva solo el nombre del archivo.
- `mobile/src/data/report-files.ts` genera el CSV o el PDF y abre la hoja de compartir de Android.
- El bloqueo biométrico se apoya en `expo-secure-store` y `expo-local-authentication`. La app se
  bloquea al volver del segundo plano, salvo durante la cámara, el selector de fotos o la hoja de
  compartir.
- `mobile/app.json` declara los permisos de cámara, notificaciones y biometría, y los plugins de
  `expo-camera`, `expo-image-picker`, `expo-notifications`, `expo-local-authentication`,
  `expo-sharing` y `expo-secure-store`.

## Verificado en el emulador

1. La app compila con el APK de debug y abre el development build sin errores de módulos nativos.
2. `Más` muestra Usuarios, Configuración, Reportes y Seguridad según los permisos del rol.
3. Usuarios lista las cuentas con rol y estado, y permite crear, editar y cambiar contraseñas.
4. Configuración carga nombre, dirección, teléfono, correo, días y horarios, alertas, plantilla de
   WhatsApp, backups y recordatorios.
5. Al activar los recordatorios, el dispositivo autoriza las notificaciones y el envío de prueba
   muestra la notificación `Veterinaria: notificaciones activas` en la barra de Android.
6. Reportes muestra el resumen del mes, inventario, ranking y medios de pago. Compartir PDF abre la
   hoja de Android con `reporte-2026-10-01_2026-10-31.pdf`.
7. En Vender, el botón de código de barras abre la cámara, pide permiso y muestra el visor con la
   guía de escaneo. En Inventario se agregó el mismo acceso.
8. En la ficha de Luna, la cámara permitió sacar una foto, recortarla y guardarla. La ficha muestra
   la imagen y el botón Quitar.
9. La pantalla Seguridad muestra el estado del hardware biométrico y el bloqueo automático. El
   emulador no tiene huellas registradas, por lo que el interruptor queda deshabilitado.
10. El recordatorio de WhatsApp se arma con el teléfono normalizado y la plantilla configurada.

## Pruebas automáticas

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` en `mobile/` | OK, sin errores |
| `npm run lint` en `mobile/` | OK, sin errores |
| `npm test` en `mobile/` | 60 tests aprobados |

Se agregaron pruebas para:

- Normalización de teléfonos argentinos, plantilla y URL de WhatsApp.
- Fechas, anticipación, identificador y cancelación de recordatorios.
- Alta, listado, edición y permisos de usuarios.
- Guardado de configuración y preferencia de recordatorios.
- Resumen de reportes del período.

## Build

- `expo prebuild --platform android` regeneró el proyecto nativo con los plugins nuevos.
- El APK de debug se compiló con `mobile/scripts/dev-android.ps1` para `x86_64`.
- Se corrigió el script para ejecutar Gradle dentro de `mobile/android`, sin depender del directorio
  desde el que se lo invoque.

## Pendiente para las fases siguientes

- Importación de backups del escritorio (Fase 5).
- Pruebas E2E con Maestro.
- APK firmado y documentación final.
- Probar el bloqueo biométrico en un dispositivo con huella o rostro registrado.

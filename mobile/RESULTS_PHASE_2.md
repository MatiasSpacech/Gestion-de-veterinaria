# Resultados de la Fase 2: capa de datos

Fecha de ejecución: 22/10/2026.

## Qué se verificó

| Punto del plan | Estado | Evidencia |
| --- | --- | --- |
| Adaptador definitivo | OK | `mobile/src/data/db.ts` con `getMobileDatabase`, `getMobileSqlite`, `getDatabasePath` y `closeMobileDatabase` |
| Controladores con sesión, permisos, Zod y auditoría | OK | `mobile/src/data/controllers/{session,permissions,validation,audit}.ts` |
| Autenticación | OK | Pantallas `setup`, `login` y logout en Más, con guard de sesión en `(tabs)/_layout.tsx` |
| Backups móviles | OK | `mobile/src/data/backups.ts` y la pantalla `/backups` |
| Pruebas de compatibilidad con el escritorio | OK | `mobile/src/data/compatibility.test.ts` |

## Sesión y permisos

- La sesión vive en memoria: `signIn`, `signOut` y `setSessionUser` en
  `mobile/src/data/controllers/session.ts`, con suscripción para React.
- El guard de `(tabs)/_layout.tsx` decide entre `/setup`, `/login` y la app según si la base tiene
  usuarios y si hay sesión abierta.
- Los permisos se resuelven con `getPermissionsForRole` del escritorio, respetando la tabla
  `role_permissions`. El test verifica que los tres roles devuelven exactamente los mismos módulos
  en el móvil y en el escritorio.
- Los errores de la app de escritorio (`AppError`) se traducen sin cambios, y los errores de Zod se
  convierten en `VALIDATION_ERROR` con el mensaje del esquema, igual que hace el IPC del
  escritorio.

## Backups móviles

- Se usa el backup online de `expo-sqlite` (`backupDatabaseSync`), que genera una copia
  consistente sin bloquear escrituras.
- Los archivos quedan en la carpeta privada de la app: `Documents/backups/`.
- El nombre es el mismo que usa el escritorio: `vetgestion-2026-10-22T14-32-22-054Z.db`.
- Backup automático diario al abrir la app, si `backup.enabled` está activo y todavía no se hizo
  uno hoy. La retención sale de `backup.retention` y borra los más viejos.
- Antes de restaurar se crea un backup de seguridad del estado actual. Al restaurar se cierra la
  base, se reemplaza el archivo, se borran los `-wal` y `-shm` y se vuelve a abrir con migraciones
  aplicadas. La app cierra la sesión y vuelve al login.
- Verificado en el emulador: el backup automático creó el primer archivo al abrir la app, el
  manual creó el segundo, la restauración reemplazó la base y el login following funcionó con el
  mismo usuario.

## Compatibilidad con el escritorio

`mobile/src/data/compatibility.test.ts` usa `better-sqlite3` (el mismo motor del escritorio) contra
el adaptador móvil (`node:sqlite`) y comprueba:

1. Las mismas versiones de migración aplicadas.
2. Las mismas tablas en el mismo orden.
3. Los mismos datos iniciales (configuraciones, categorías y servicios de peluquería).
4. Una base creada por el escritorio se abre desde el móvil y se leen los mismos clientes.
5. Los mismos permisos por rol.
6. Los mismos hashes de contraseña (`scrypt` con sal de 16 bytes y clave de 64 bytes).

## Verificaciones automáticas

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` en `mobile/` | OK, sin errores |
| `npm run lint` en `mobile/` | OK, sin errores |
| `npm test` en `mobile/` | 33 tests aprobados |
| `npm run typecheck` en la raíz | OK, sin errores |
| `npm run lint` en la raíz | OK, sin errores |
| `npm test` en la raíz | 50 tests aprobados |

## Próximos pasos

1. Empezar la Fase 3 con el panel real: ventas del día, turnos, stock bajo y vacunas próximas.
2. Clientes, mascotas e historial clínico.

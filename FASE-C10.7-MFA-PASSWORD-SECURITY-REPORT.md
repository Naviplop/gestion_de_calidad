# FASE C.10.7 — MFA, Password Recovery & Authentication Hardening

## Resumen
Implementación de MFA basado en TOTP (RFC 6238), cambio de password autenticado, recuperación de password por token seguro, códigos de recuperación MFA, rate limiting ampliado e integración completa de eventos de seguridad. Todo sin romper contratos API existentes, manteniendo tenant isolation y arquitectura actual.

## Objetivos Cumplidos
- MFA / 2FA basado en TOTP RFC 6238 con `speakeasy`.
- Flujo de login MFA challenge existente actualizado a TOTP real.
- Códigos de recuperación MFA hasheados (argon2id), un solo uso, generación segura.
- Cambio de password autenticado con invalidación de refresh tokens.
- Recuperación de password mediante token seguro de un solo uso con expiración.
- Rate limiting en endpoints sensibles (MFA verify, recovery, change-password).
- Eventos de seguridad asociados sin logueo de secretos.
- Frontend: página `/security` con tabs MFA/Password/Recovery y Login MFA UX.
- Regresión completa verde.

## Cambios Backend

### Base de Datos
- `schema.prisma`: `MfaSession.mfaCode` pasado a nullable (ya no almacena código TOTP en BD).
- `schema.prisma`: agregado modelo `PasswordResetToken` (id, userId, organizationId, tokenHash, expiresAt, usedAt, createdAt).
- Migración aplicada vía `prisma db push` (entorno sin permisos de shadow DB). `prisma generate` ejecutado.

### Servicios Nuevos/Modificados
| Servicio | Cambios |
|----------|---------|
| `MfaService` | Nuevo. Setup TOTP, verify-setup, disable (requiere password + código), status, recovery codes, validateTotp con speakeasy. |
| `AuthService` | Modificado. Login crea `MfaSession` real. `verifyMfa` ahora valida TOTP o recovery code. Agregados `changePassword`, `requestPasswordReset`, `resetPassword`. |
| `AuthController` | Modificado. Agregados endpoints: `POST /auth/mfa/setup`, `POST /auth/mfa/verify-setup`, `POST /auth/mfa/disable`, `GET /auth/mfa/status`, `POST /auth/mfa/recovery-codes/generate`, `POST /auth/change-password`, `POST /auth/password-recovery/request`, `POST /auth/password-recovery/reset`. |
| `AuthModule` | Registrado `MfaService`. |

### Seguridad MFA
- Secret TOTP generado con `speakeasy.generateSecret` (CSPRNG).
- Nunca se devuelve secret después de la activación.
- Nunca se registra secret, TOTP ni recovery code en logs.
- MFA session con expiración de 5 minutos.
- `verifyMfa` invalida sesión MFA después de éxito (`verified: true`).
- Recovery codes generados con `crypto.randomUUID + timestamp`, hasheados con argon2id.
- Recovery code de un solo uso (`usedAt` timestamp).

### Password Recovery
- Token generado con `crypto.randomBytes(32)`.
- Solo se almacena `sha256(token)` en BD.
- Expiración: 1 hora.
- Un solo uso (`usedAt`).
- Respuesta genérica para no revelar existencia de cuenta.
- Invalidación de todos los refresh tokens tras reset exitoso.
- Invalidación de tokens previos del mismo usuario tras reset.

### Rate Limiting
- `ThrottlerGuard` aplicado en: `login`, `mfa/verify`, `refresh`, `change-password`, `password-recovery/request`, `password-recovery/reset`.
- Configurable via `AUTH_THROTTLE_TTL` y `AUTH_THROTTLE_LIMIT`.

### Security Events
| Evento | Flujo |
|--------|-------|
| `MFA_CHALLENGE_CREATED` | Login con MFA activo |
| `MFA_SUCCESS` | verifyMfa exitoso |
| `MFA_FAILURE` | verifyMfa inválido |
| `MFA_ENABLED` | verifyMfaSetup exitoso |
| `MFA_DISABLED` | disableMfa exitoso |
| `MFA_RECOVERY_CODES_REGENERATED` | generateRecoveryCodes |
| `MFA_RECOVERY_CODE_USED` | verifyRecoveryCode exitoso |
| `PASSWORD_CHANGED` | changePassword exitoso |
| `PASSWORD_CHANGE_FAILED` | password actual inválida en change-password |
| `PASSWORD_RESET_REQUESTED` | requestPasswordReset (si usuario existe y activo) |
| `PASSWORD_RESET` | resetPassword exitoso |
| `PASSWORD_RESET_FAILED` | token inválido/expirado/usado |

### Organización / Tenant Isolation
- `organizationId` nunca se acepta de body/query/path en endpoints protegidos.
- Se extrae exclusivamente del usuario autenticado (JWT/refresh token).
- SecurityEvents se registran con `organizationId` del actor.

## Cambios Frontend

### Tipos
- `LoginResponse` extendida con `mfaRequired?: boolean` y `sessionId` para flujo MFA.
- Agregadas interfaces: `MfaSetupResponse`, `MfaStatusResponse`, `MfaVerifySetupResponse`, `MfaDisableResponse`, `MfaRecoveryCodesResponse`, `ChangePasswordResponse`, `PasswordRecoveryRequestResponse`, `PasswordRecoveryResetResponse`.

### API Client
- `authApiClientWithEvents` expone nuevos métodos: `verifyMfa`, `setupMfa`, `verifyMfaSetup`, `disableMfa`, `getMfaStatus`, `generateRecoveryCodes`, `changePassword`, `requestPasswordReset`, `resetPassword`.

### AuthContext
- Agregados estados: `mfaSessionId`, `setMfaSessionId`, `completeMfaLogin`.
- Persistencia de `mfaSessionId` en localStorage.
- Limpieza de `mfaSessionId` en login/logout.

### LoginPage
- Flujo MFA: si login devuelve `mfaRequired`, renderiza `MfaChallengeForm` en lugar de `LoginForm`.
- Después de verifyMfa exitoso, completa autenticación y redirige.

### SecuritySettingsPage (`/security`)
- Tab MFA: enable/disable, QR code, TOTP verification, recovery codes, regenerate.
- Tab Password: change password (current + new).
- Tab Recovery: request reset + reset con token.
- Estados loading/error/success manejados.

### Componentes
- `MfaChallengeForm`: formulario controlado para código TOTP durante login MFA.

## Tests

### Backend
- `mfa.service.spec.ts`: setup, verify-setup, disable, status, recovery codes, verify recovery code.
- `auth.service.spec.ts`: changePassword, requestPasswordReset, resetPassword.
- Cobertura agregada: 2 suites nuevas / 24 tests nuevos.
- Total backend: 31 suites / 242 tests PASS.

### Frontend
- No se eliminaron tests existentes.
- Total frontend: 5 suites / 10 tests PASS.
- Nota: frontend depende de backend real para pruebas E2E profundas de MFA/recovery; se recomienda agregar tests de integración en fase posterior.

## Quality Gates

### Backend
| Gate | Resultado |
|------|-----------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS (242/242) |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx prisma migrate status` | PASS |
| Seed idempotente x3 | PASS |

### Frontend
| Gate | Resultado |
|------|-----------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS (10/10) |
| `npm run build` | PASS |

## Seguridad
- No se loguean passwords, passwordHash, accessToken, refreshToken, JWT, cookies, MFA secret, recovery token, authorization header.
- Respuestas genéricas en password recovery (no revelan existencia de cuenta).
- organizationId extraído exclusivamente del request autenticado.
- Argon2id para passwords y recovery codes.
- TOTP RFC 6238 con speakeasy.
- Refresh tokens con rotación y detección de reuso.
- Rate limiting en flujos sensibles.

## Issues Found & Corrected
1. `otplib` incompatible con Node 22 en tests por plugin base32-scure. Corregido migrando a `speakeasy`.
2. `$transaction` con operaciones mixtas (PrismaPromise + Promise<void>) causaba error de tipado. Corregido ejecutando operaciones secuenciales.
3. `MfaSession.mfaCode` innecesario para TOTP. Corregido haciendo el campo nullable.
4. `disableMfa` sin requerir código MFA cuando MFA activo. Corregido agregando validación obligatoria de TOTP o recovery code.
5. Faltaba `ThrottlerGuard` en `change-password`. Corregido.
6. Tipos frontend incompletos para respuestas MFA/recovery. Corregido extendiendo `LoginResponse` y agregando interfaces específicas.
7. `AuthContext` no soportaba estado MFA. Corregido agregando `mfaSessionId` y `completeMfaLogin`.
8. `AuthApiClientWithSecurityEvents` no exponía métodos nuevos. Corregido agregando delegación a `authApiClient`.

## Limitaciones Conocidas
- No hay envío real de email para password recovery (documentado como pendiente). El flujo está implementado pero requiere provider de email en fase posterior.
- No hay SMS/WhatsApp MFA (fuera de scope).
- No hay WebAuthn/passkeys (fuera de scope).
- Seed no crea usuarios con MFA activo (por diseño, para no exponer secrets en seed).
- Tests frontend no cubren flujos MFA/recovery de forma aislada (requieren backend real o mocks más profundos).

## Out of Scope
- Redis, microservices, colas, event sourcing.
- SIEM, email provider real, SMS MFA.
- SSO/OAuth, billing, subscriptions.
- BI/ reporting avanzado.

## Regresión Final
- Backend: typecheck, lint, tests, build, Prisma validate/generate/migrate, seed x3 — **TODOS PASS**.
- Frontend: typecheck, lint, tests, build — **TODOS PASS**.

## Veredicto
**GREEN**

# AUTH_SPEC.md — Authentication, Authorization & Identity Specification

## 1. Auth Contract Conflicts

No se detectaron contradicciones entre `ARCHITECTURE.md`, `SECURITY.md`, `API_SPEC.md`, `DOMAIN.md` y `prisma/schema.prisma` que impidan definir la especificación de autenticación en esta fase.

Si en fases futuras se detectan discrepancias, se documentarán en `AUTH_CONTRACT_CONFLICT` con:
- fuente;
- sección;
- descripción del conflicto;
- impacto;
- resolución recomendada.

---

## 2. Principles

Authentication responde: **¿Quién eres?**  
Authorization responde: **¿Qué puedes hacer?**  
Tenant Context responde: **¿En qué organización estás operando?**  
Resource Authorization responde: **¿Puedes operar sobre ESTE recurso?**

Las cuatro capas son independientes y se evalúan en secuencia.

### 2.1 Integración con DOMAIN.md

El módulo de identidad **no contiene reglas de negocio**. Su única responsabilidad es establecer:

- **identity**: quién es el actor autenticado.
- **session**: sesión activa y su ciclo de vida.
- **tenant**: `organizationId` de operación.
- **authorization context**: permisos efectivos del usuario.

Cualquier regla de negocio (ej: "un documento puede publicarse si...") pertenece al dominio y se evalúa después de la autorización.

---

## 3. Authentication Flow

```
Client
  ↓
POST /api/v1/auth/login
  ↓
Credential validation (email + password hash)
  ↓
Account status validation (active, locked, inactive)
  ↓
MFA decision (mfaEnabled?)
  ↓
Session creation (refresh token + metadata)
  ↓
Access token (JWT corto)
  ↓
Refresh token (hash almacenado)
```

Reglas:
- El tenant **nunca** se determina desde el body/query del cliente.
- El backend resuelve `organizationId` desde el usuario autenticado.
- La contraseña nunca se devuelve en respuestas.
- Los tokens nunca se devuelven en logs.

---

## 4. Login

### 4.1 Endpoint

`POST /api/v1/auth/login`

**Authentication:** public  
**Tenant scope:** no (resuelve tenant desde credenciales)  
**Audit:** sí (`LOGIN_SUCCESS` / `LOGIN_FAILED`)  
**Rate limit:** AUTH (5 intentos/minuto por IP + 10 por email)

### 4.2 Request

```json
{
  "email": "user@example.com",
  "password": "string",
  "mfaCode": "123456" // opcional si MFA está activo
}
```

**Nota:** no se acepta `organizationId` en el request para determinar seguridad. Si se envía, se ignora.

### 4.3 Response 200

```json
{
  "data": {
    "accessToken": "string",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "sessionId": "uuid",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "string",
      "lastName": "string",
      "mfaEnabled": true,
      "tenant": {
        "organizationId": "uuid",
        "name": "string"
      },
      "roles": [
        {
          "id": "uuid",
          "name": "string"
        }
      ]
    }
  }
}
```

**Cookie:**
- `refreshToken`: HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth, Max-Age=604800

Nunca se devuelven:
- password hash
- MFA secret
- recovery codes
- refresh token en response body
- internal database IDs innecesarios
- security metadata sensible

### 4.4 Errores

| Código | HTTP | Mensaje público | Evento interno | Audit |
|---|---|---|---|---|
| `INVALID_CREDENTIALS` | 401 | "Invalid credentials." | `LOGIN_FAILED` | sí |
| `MFA_REQUIRED` | 401 | "MFA required." | `MFA_FAILED` | sí |
| `ACCOUNT_LOCKED` | 403 | "Account locked." | `ACCOUNT_LOCKED` | sí |
| `ACCOUNT_INACTIVE` | 403 | "Account inactive." | — | sí |
| `RATE_LIMIT_EXCEEDED` | 429 | "Too many requests." | — | sí |

**Regla anti-enumeración:** el mensaje público es genérico para credenciales inválidas. No se revela si el email existe.

---

## 5. User Lookup

El backend busca el usuario por `email`.

Pasos:
1. Buscar usuario activo por email (case-insensitive si la configuración lo requiere).
2. Si no existe, simular verificación de password y retrasar respuesta (timing attack mitigation).
3. Si existe, validar `organizationId` y estado.
4. Verificar password hash.
5. Si MFA activo, validar código o recovery code.
6. Crear sesión y emitir tokens.

**Validaciones:**
- `isActive = true`
- `deletedAt IS NULL`
- `isLocked = false` o `lockedUntil < NOW()`
- `mfaEnabled` determina si requiere `mfaCode`

---

## 6. Password Hashing

### 6.1 Algoritmo

**Argon2id** (ganador Password Hashing Competition 2015).

### 6.2 Parámetros

```json
{
  "timeCost": 3,
  "memoryCost": 65536,
  "parallelism": 4,
  "hashLength": 32,
  "saltLength": 16
}
```

- `timeCost`: 3 iteraciones.
- `memoryCost`: 65536 KB (64 MB).
- `parallelism`: 4 hilos.
- `hashLength`: 32 bytes.
- `saltLength`: 16 bytes.

Los parámetros deben ser configurables por `organization_settings` para poder escalar hardware sin migraciones.

### 6.3 Rehash Strategy

- Si los parámetros de hash cambian (actualización de política), se rehash en el próximo login exitoso.
- El backend compara `memoryCost`/`timeCost` almacenados vs configuración actual.
- Si difieren, rehash transparente.

---

## 7. Password Policy

### 7.1 Requisitos

- **Longitud mínima:** 12 caracteres.
- **Complejidad:** mezcla de mayúsculas, minúsculas, números y símbolos.
- **Breached password protection:** verificación contra Have I Been Pwned API (k-anonymity) en enrollment/cambio.
- **Reuse:** no permite los últimos 5 passwords.
- **History:** se almacena hash de últimos 5 passwords.
- **Reset:** expiración 1 hora, un solo uso, invalida sesiones activas.
- **Change:** requiere password actual.
- **Lockout:** 5 intentos fallidos -> bloqueo 30 minutos.

### 7.2 Lockout

| Intento | Acción |
|---|---|
| 1-4 | Registro de intento fallido |
| 5 | `isLocked = true`, `lockedUntil = NOW() + 30 minutos` |
| >5 | Mismo estado; no extiende bloqueo |

Admin puede desbloquear manualmente.

---

## 8. Access Token

### 8.1 Mecanismo

JWT firmado con HS256 o RS256.

### 8.2 Claims

| Claim | Tipo | Descripción |
|---|---|---|
| `sub` | string | `userId` |
| `sid` | string | `sessionId` (refresh token id) |
| `org` | string | `organizationId` |
| `iat` | number | issued at |
| `exp` | number | expiration |
| `iss` | string | issuer (`QMS Platform`) |
| `aud` | string | audience (`QMS API`) |
| `permissionsHash` | string | SHA-256 hash de permisos efectivos (opcional, para invalidación rápida) |

**No se incluye:**
- lista completa de permisos (tamaño, revocación).
- datos sensibles (password, MFA secret).
- información innecesaria (roles detallados, claims custom sin validar).

### 8.3 Lifetime

**15 minutos.**

Justificación:
- Ventana de exposición corta ante robo de token.
- Compatible con refresh token rotation.
- No obliga a re-login excesivo (refresh transparente).

### 8.4 Storage Frontend

- **Memoria** (variable en memoria del navegador).
- **NO localStorage/sessionStorage** (accesible por XSS).
- Se limpia al cerrar el navegador.

---

## 9. JWT Claims Strategy

### 9.1 Claims confiables

Solo `sub`, `sid`, `org`, `iat`, `exp`, `iss`, `aud` son confiables para autorización.

### 9.2 Permisos

Los permisos **no** se confían desde el JWT.

Estrategia:
1. JWT contiene `sub` y `org`.
2. Backend carga permisos efectivos desde base de datos o cache.
3. Cache: `authz:{organizationId}:{userId}` en Redis.
4. TTL: 5 minutos.
5. Invalidación: al cambiar roles/permisos, se limpia cache.

Justificación:
- Permisos cambian con frecuencia.
- JWT limitado en tamaño.
- Revocación inmediata sin esperar expiración del token.

---

## 10. Refresh Token

### 10.1 Lifetime

**7 días.**

### 10.2 Storage

Backend almacena:
- `tokenHash`: SHA-256 del refresh token (nunca en texto plano).
- `userId`
- `organizationId`
- `userAgent`
- `ipAddress`
- `expiresAt`
- `revokedAt`
- `replacedBy`: tokenId del token de reemplazo (para revocación de familia).

Tabla: `refresh_tokens`.

### 10.3 Rotation

Cada uso de refresh token genera uno nuevo.

Flujo:
1. Cliente envía `POST /auth/refresh`.
2. Backend extrae refresh token de cookie `refreshToken`.
3. Backend valida hash, `expiresAt`, `revokedAt`.
4. Backend invalida token actual (`revokedAt = NOW()`).
5. Backend genera nuevo refresh token opaco.
6. Backend almacena nuevo token y actualiza `replacedBy`.
7. Backend establece nueva cookie `HttpOnly; Secure; SameSite=Strict` con el nuevo refresh token.
8. Backend retorna nuevo access token en response JSON.

El refresh token **no** se devuelve en el response body.

### 10.4 Reuse Detection

Si se detecta un refresh token revocado que se está reutilizando:
- Se marca como `REUSED`.
- Se invalidan **todos** los refresh tokens del usuario (familia completa).
- Se cierran todas las sesiones activas.
- Se genera evento de seguridad `AUTH_REFRESH_REUSE`.
- Se requiere re-autenticación.

### 10.5 Revocación

- Logout individual: invalida el refresh token usado.
- Logout all: invalida todos los refresh tokens del usuario.
- Password change/reset: invalida todos los refresh tokens.
- Account lock: invalida todos los refresh tokens.
- MFA disable: invalida todos los refresh tokens (opcional según política).
- Admin revocation: invalida tokens específicos.

---

## 11. Session Model

### 11.1 Definición

Una sesión lógica representa un dispositivo/navegador autenticado.

Se materializa mediante un `RefreshToken` y su metadata.

### 11.2 Metadata almacenada

| Campo | Tipo | Descripción |
|---|---|---|
| `sessionId` | UUID | ID del refresh token |
| `userId` | UUID | Usuario autenticado |
| `organizationId` | UUID | Tenant |
| `createdAt` | Timestamp | Creación de la sesión |
| `lastSeenAt` | Timestamp | Último uso del refresh token |
| `expiresAt` | Timestamp | Expiración del refresh token |
| `ipAddress` | string | IP del dispositivo |
| `userAgent` | string | User agent del dispositivo |
| `revokedAt` | Timestamp | Cuándo se revocó (null = activa) |

**No se almacenan:** secretos, passwords, tokens en texto plano.

### 11.3 Operaciones

- **Listar sesiones:** `GET /auth/sessions` (solo activas).
- **Cerrar sesión:** `DELETE /auth/sessions/:sessionId`.
- **Cerrar todas:** `DELETE /auth/sessions` (excepto la actual, o todas según política).

### 11.4 Sesiones sospechosas

Detección conceptual:
- IP de país diferente al habitual (si hay histórico).
- User agent completamente nuevo.
- Más de N sesiones activas simultáneas (configurable).

Acción:
- Notificar al usuario.
- No bloquear automáticamente.
- Permitir revocación manual.

---

## 12. Logout

### 12.1 Logout individual

`POST /api/v1/auth/logout`

**Request:** Sin body. El refresh token se extrae de la cookie `refreshToken`.

**Response:** `204 No Content`

**Efectos:**
- `refresh_tokens.revokedAt = NOW()`
- Genera security event `AUTH_LOGOUT`.
- Genera `AuditLog`.
- Establece cookie `refreshToken` con expiración pasada.
- No invalida el access token (se respeta su TTL).

### 12.2 Logout all

`POST /api/v1/auth/logout-all` o `DELETE /auth/sessions`

**Efectos:**
- Invalida todos los refresh tokens del usuario.
- Obliga a re-login en todos los dispositivos.
- Genera security event `AUTH_LOGOUT_ALL`.
- Genera `AuditLog`.

### 12.3 Invalidación de access token

El access token sigue siendo válido hasta su expiración (15 min). Si se requiere invalidación inmediata:
- Se almacena un `tokenVersion` o `sessionId` en Redis blacklist hasta `exp`.
- Se verifica en `AuthGuard` contra blacklist.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con MFA y Mecanismos de Recuperación]

---

## 13. MFA (Multi-Factor Authentication)

### 13.1 Arquitectura

- Mecanismo principal: **TOTP** (RFC 6238).
- Período: 30 segundos.
- Dígitos: 6.
- Ventana de tolerancia: 1 período anterior y posterior (para desfase de reloj).
- Un usuario no puede tener múltiples credenciales MFA activas.

### 13.2 Enrollment Flow

1. Usuario autenticado solicita enrollment.
2. Backend genera secret TOTP (16+ caracteres base32).
3. Backend cifra secret con **AES-256-GCM** antes de almacenar.
4. Backend genera URL TOTP (`otpauth://totp/...`) y código QR.
5. Backend retorna URL/QR y **8 recovery codes**.
6. Usuario escanea QR y confirma con código TOTP.
7. Backend valida código y activa `mfaEnabled = true`.
8. Backend genera evento `MFA_ENABLED`.

**Regla:** MFA no se considera activo hasta completar la verificación.

### 13.3 Activation

- Estado intermedio: `mfaEnabled = false` (pendiente de verificación).
- Solo tras verificación exitosa: `mfaEnabled = true`.
- El secret se devuelve una sola vez (en el enrollment).

### 13.4 Verification

**En login:**
- Si `mfaEnabled = true`, se requiere `mfaCode` o recovery code.
- Backend descifra secret y valida TOTP con ventana de tolerancia.
- Si es recovery code: busca hash en array, marca como usado, elimina código.
- Si es válido: se procede a generar tokens.

**Reglas:**
- Recovery code: un solo uso.
- Si se usan todos los recovery codes: forzar regeneración.

### 13.5 Disable

Requerimientos:
- Password actual del usuario.
- Código TOTP válido O recovery code válido.

Si es **admin** quien deshabilita MFA de otro usuario:
- Requiere justificación.
- Se audita obligatoriamente.

**Efectos:**
- Eliminar secret TOTP.
- Eliminar recovery codes.
- Establecer `mfaEnabled = false`.
- Invalidar todas las sesiones activas (recomendado).
- Evento: `MFA_DISABLED`.

### 13.6 Recovery Codes

| Característica | Valor |
|---|---|
| Cantidad | 8 |
| Formato | 10 caracteres alfanuméricos |
| Generación | Aleatorio criptográfico seguro |
| Almacenamiento | Hash SHA-256 (nunca texto plano) |
| Consumo | Un solo uso; se elimina al usar |
| Regeneración | Invalida todos los códigos anteriores |
| Agotamiento | Si se usan todos, se fuerza regeneración |

### 13.7 MFA Secret

- Generación: 16+ caracteres base32.
- Cifrado: AES-256-GCM antes de almacenar.
- Nunca en logs.
- Nunca en respuestas posteriores al enrollment.
- No se envía nuevamente innecesariamente.

### 13.8 MFA Compromise

Procedimiento ante pérdida de dispositivo o compromiso:

1. Usuario o admin detecta compromiso.
2. Se regenera secret TOTP (invalida secreto anterior).
3. Se regeneran recovery codes (invalida anteriores).
4. Se cierran todas las sesiones activas.
5. Se genera evento de seguridad.
6. Se requiere re-enrollment en nuevos dispositivos.

### 13.9 Endpoints MFA

| Endpoint | Método | Auth | Permission | Descripción |
|---|---|---|---|---|
| `/auth/mfa/enroll` | POST | required | `mfa:manage` | Genera secret y QR |
| `/auth/mfa/verify` | POST | required | `mfa:manage` | Verifica y activa MFA |
| `/auth/mfa/disable` | POST | required | `mfa:manage` | Desactiva MFA |
| `/auth/mfa/recovery-codes/regenerate` | POST | required | `mfa:manage` | Regenera recovery codes |
| `/auth/mfa/status` | GET | required | `mfa:read` | Consulta estado MFA |

---

## 14. Password Reset

### 14.1 Flujo

1. Usuario solicita reset con email: `POST /auth/forgot-password`.
2. Backend genera token seguro aleatorio (128 bits).
3. Token se hashea y almacena con expiración **1 hora**.
4. Backend envía email con link que incluye token.
5. Usuario abre link y envía nuevo password: `POST /auth/reset-password`.
6. Backend valida token, actualiza password, invalida token.
7. Backend invalida todas las sesiones activas del usuario.
8. Backend genera eventos `PASSWORD_RESET_COMPLETED` y `LOGOUT_ALL`.

### 14.2 Características del token

- Aleatorio: 128 bits.
- Almacenamiento: hash SHA-256.
- Expiración: 1 hora.
- Un solo uso: se invalida después de consumir.
- No revela si el usuario existe (respuesta genérica).

### 14.3 Endpoints

| Endpoint | Método | Auth | Descripción |
|---|---|---|---|
| `/auth/forgot-password` | POST | public | Solicita reset |
| `/auth/reset-password` | POST | public | Consume token y cambia password |

### 14.4 Errores

| Código | HTTP | Mensaje público |
|---|---|---|
| `INVALID_TOKEN` | 400 | "Invalid or expired token." |
| `WEAK_PASSWORD` | 422 | "Password does not meet policy." |

### 14.5 Seguridad

- Rate limit: 3 requests por minuto por email.
- No se revela si el email existe.
- Token nunca se devuelve en respuestas de consulta.
- Al completar reset, se cierran todas las sesiones activas.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Tenant Context, RBAC y Capa de Protección]

---

## 15. Tenant Context

### 15.1 Definición

El `organizationId` es el tenant de seguridad. Se determina exclusivamente desde la identidad autenticada.

### 15.2 Fuentes de verdad

1. **JWT claim `org`** (primaria).
2. **Sesión asociada al refresh token** (secundaria).

Nunca se acepta `organizationId` desde:
- `req.body`
- `req.query`
- `req.headers` (no confiables para seguridad)

### 15.3 Reglas estrictas

- El backend resuelve `organizationId` desde el usuario autenticado (`sub` -> `User` -> `organizationId`).
- Si el recurso tiene `organizationId`, se valida contra el del contexto.
- Cualquier `organizationId` enviado por el cliente que no coincida con el contexto se ignora o rechaza con `403 Forbidden`.
- El frontend nunca determina el tenant.

### 15.4 Propagación

1. `AuthGuard` valida JWT y extrae `organizationId`.
2. Se inyecta en `RequestContext`.
3. `Prisma Middleware` adjunta filtro automático.
4. PostgreSQL RLS actúa como segunda barrera (`SET LOCAL app.current_organization_id`).

### 15.5 Entidades globales

- `permissions`
- `standards`
- `standard_requirements`
- `document_types`

No tienen `organizationId`. Su acceso está regulado por permisos de sistema, no por tenant context.

---

## 16. RBAC

### 16.1 Modelo

```
User ──(1:N)──> UserRole <──(N:1)── Role ──(1:N)──> RolePermission <──(N:1)── Permission
```

- Un usuario puede tener múltiples roles.
- Un rol agrupa múltiples permisos.
- Los permisos efectivos son la unión de todos los permisos de sus roles activos.
- Los roles son tenant-scoped.

### 16.2 Roles

- Pertenece a una organización (`organizationId`).
- `isSystem` para roles globales (no tenant-scoped).
- `name` único dentro de la organización.
- Un rol desactivado no puede asignarse a nuevos usuarios.

### 16.3 Permisos

- Formato: `resource:action`.
- Ejemplos:
  - `documents:read`
  - `documents:approve`
  - `audits:create`
  - `nonconformities:close`
  - `audit-logs:read`
- `code` único globalmente.
- No se asignan permisos directamente a usuarios; solo mediante roles.

### 16.4 Asignación de roles

- Un usuario no puede asignarse roles a sí mismo.
- Solo roles con `roles:manage` pueden modificar asignaciones.
- Las asignaciones pueden tener `expiresAt`.
- Toda modificación se audita.

---

## 17. Permission Format & Naming

### 17.1 Convención

`resource:action`

- `resource`: singular o plural consistente.
- `action`: verbo en infinitivo o forma corta.
- Todo en minúsculas.
- Sin espacios ni guiones medios.

### 17.2 Ejemplos

| Recurso | Acciones |
|---|---|
| `documents` | `read`, `create`, `update`, `approve`, `publish`, `obsolete`, `cancel`, `distribute`, `sign`, `download` |
| `audits` | `read`, `create`, `update`, `start`, `complete`, `cancel`, `createFindings`, `updateFindings` |
| `nonconformities` | `read`, `create`, `update`, `close`, `createActions`, `verifyActions` |
| `risks` | `read`, `create`, `update`, `assess`, `createTreatments`, `updateTreatments` |
| `training` | `read`, `create`, `update`, `createSessions`, `registerParticipants`, `updateParticipants` |
| `indicators` | `read`, `create`, `update`, `record` |
| `notifications` | `read`, `updatePreferences` |
| `audit-logs` | `read` |
| `users` | `read`, `create`, `update`, `activate`, `deactivate`, `assignRoles` |
| `roles` | `read`, `create`, `update`, `deactivate` |
| `organization` | `read`, `update`, `updateSettings`, `updateStandards` |

### 17.3 Permisos de sistema

- `system:manage`
- `system:configure`

Solo se asignan a roles especiales. No disponibles para roles tenant-scoped regulares.

---

## 18. Authorization Check

Cada request protegido pasa por:

1. **Authentication**: JWT válido, no revocado, no expirado.
2. **Tenant Context**: `organizationId` del JWT coincide con el recurso.
3. **Permission**: verifica permiso requerido.
4. **Resource Authorization**: valida propiedad del recurso.
5. **Domain Rules**: valida estado del recurso para la operación.

No basta con comprobar `user.roles.includes("ADMIN")`. Se evalúan permisos explícitos.

---

## 19. Guards (Conceptual)

Cada guard tiene responsabilidad única:

| Guard | Responsabilidad |
|---|---|
| `AuthGuard` | Valida JWT, extrae identity. No autoriza. |
| `TenantGuard` | Valida aislamiento de tenant. Aplica filtros. |
| `PermissionGuard` | Verifica permiso requerido contra permisos efectivos. |
| `ResourceAuthorization` | Valida propiedad del recurso específico. |

---

## 20. Decorators (Conceptual)

| Decorator | Propósito |
|---|---|
| `@Public()` | Marca endpoint como público (sin auth). |
| `@CurrentUser()` | Inyecta usuario autenticado en parámetro. |
| `@CurrentOrganization()` | Inyecta `organizationId` en parámetro. |
| `@RequirePermissions('documents:approve')` | Valida permisos requeridos. |
| `@RequireResourceOwnership()` | Valida que el usuario es dueño del recurso. |

No implementar código todavía.

---

## 21. Account States

| Estado | Puede login | Puede refresh | Puede operar | Descripción |
|---|---|---|---|---|
| `PENDING` | No | No | No | Usuario creado pero no activado (si aplica) |
| `ACTIVE` | Sí | Sí | Sí | Estado normal |
| `LOCKED` | No | No | No | Bloqueo temporal por intentos fallidos |
| `INACTIVE` | No | No | No | Desactivado por admin |
| `SUSPENDED` | No | No | No | Suspendido por admin |

---

## 22. Account Lockout

- **Threshold:** 5 intentos fallidos.
- **Duración:** 30 minutos.
- **Lockout progresivo:** no se extiende con intentos adicionales.
- **Admin unlock:** manual, con justificación y auditoría.
- **Evento:** `ACCOUNT_LOCKED`.
- **Audit:** sí.

Regla:
- `failedLoginAttempts >= 5` implica `isLocked = true`, `lockedUntil = NOW() + 30 minutos`.
- No bloqueo permanente (evita DoS).

---

## 23. Brute Force Protection

Rate limits:

| Recurso | Límite | Ventana | Clave |
|---|---|---|---|
| Login | 5 requests | 1 minuto | IP + email |
| MFA | 5 intentos | 1 minuto | IP + email |
| Password reset | 3 requests | 1 minuto | email |
| Refresh token | 10 requests | 1 minuto | IP + userId |
| API global | 100 requests | 1 minuto | IP |

Implementación: Redis + `@nestjs/throttler`.

Respuesta al exceder límite:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "correlationId": "uuid"
  }
}
```

---

## 24. Session Anomalies

Detección conceptual:

- Más de N sesiones activas simultáneas (configurable, default 10).
- IP de país diferente al habitual (si hay histórico).
- User agent completamente nuevo.

Acción:
- Notificar al usuario.
- No bloquear automáticamente.
- Permitir revocación manual.

---

## 25. Admin Elevation

Operaciones que requieren step-up authentication:

| Operación | Requisito adicional |
|---|---|
| Deshabilitar MFA de otro usuario | Justificación + auditoría |
| Asignar rol con privilegios elevados | Confirmación explícita |
| Exportar datos sensibles | Confirmación + límite de tiempo |
| Cambiar configuración de seguridad | Confirmación + MFA |

Definir posteriormente para cada operación según sensibilidad.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Eventos de Seguridad, Matrices, Testing y Definition of Done]

---

## 26. Security Events

### 26.1 Definición

Eventos inmutables generados por acciones de seguridad relevantes.

Cada evento contiene:

| Campo | Tipo | Descripción |
|---|---|---|
| `actorId` | UUID | Usuario que ejecuta la acción |
| `organizationId` | UUID | Tenant afectado |
| `targetUserId` | UUID | Usuario objetivo (si aplica) |
| `eventType` | string | Código del evento |
| `timestamp` | Timestamp | Momento del evento |
| `correlationId` | UUID | Correlación con request |
| `metadata` | JSONB | Datos adicionales permitidos |

### 26.2 Catálogo de eventos

| Evento | Categoría | Descripción |
|---|---|---|
| `LOGIN_SUCCESS` | auth | Login exitoso |
| `LOGIN_FAILED` | auth | Intento de login fallido |
| `LOGOUT` | auth | Logout individual |
| `LOGOUT_ALL` | auth | Logout de todos los dispositivos |
| `TOKEN_REFRESH` | auth | Refresh exitoso |
| `TOKEN_REVOKED` | auth | Token revocado |
| `TOKEN_REUSE_DETECTED` | auth | Reúso de refresh token |
| `PASSWORD_CHANGED` | auth | Cambio de contraseña |
| `PASSWORD_RESET_REQUESTED` | auth | Solicitud de reset |
| `PASSWORD_RESET_COMPLETED` | auth | Reset completado |
| `MFA_ENROLLMENT_STARTED` | mfa | Inicio de enrollment MFA |
| `MFA_ENABLED` | mfa | MFA activado |
| `MFA_DISABLED` | mfa | MFA desactivado |
| `MFA_FAILED` | mfa | Verificación MFA fallida |
| `RECOVERY_CODE_USED` | mfa | Recovery code consumido |
| `ACCOUNT_LOCKED` | auth | Cuenta bloqueada |
| `ROLE_ASSIGNED` | rbac | Rol asignado |
| `ROLE_REVOKED` | rbac | Rol revocado |
| `PERMISSION_DENIED` | auth | Acceso denegado por permisos |
| `SUSPICIOUS_SESSION` | auth | Sesión sospechosa detectada |

### 26.3 Metadata permitida

- `ipAddress`
- `userAgent`
- `reason` (motivo de bloqueo, etc.)
- `mfaMethod` (totp, recovery_code)
- `changedBy` (quién modificó qué)
- `affectedSessions` (cantidad de sesiones cerradas)
- `failureReason` (credenciales inválidas, etc.)

### 26.4 Inmutabilidad

Los security events son inmutables una vez generados. No se actualizan ni eliminan.

---

## 27. Audit

### 27.1 Diferencia: Security Event vs Business Audit Event

| Aspecto | Security Event | Audit Log (Business) |
|---|---|---|
| Propósito | Seguridad operativa | Cumplimiento y trazabilidad |
| Volumen | Bajo-Medio | Alto |
| Retención | 1 año | Según normativa aplicable |
| Contenido | Eventos de auth, permisos | Cambios de entidades de negocio |
| Hash chain | No requerida | Requerida (ver DATABASE.md) |
| Actor | system | usuario autenticado |
| Tabla | `security_events` | `audit_logs` |

### 27.2 Cuándo generar Security Event

- Login success/failed
- Logout
- Token refresh
- Token revocado
- Reúso detectado
- Password changed/reset
- MFA enabled/disabled/failed
- Recovery code usado
- Account locked
- Role assigned/revoked
- Permission denied
- Sesión sospechosa

### 27.3 Cuándo generar Audit Log

- Creación/actualización de entidades de negocio (documentos, no conformidades, hallazgos, etc.)
- Transiciones de estado
- Firma electrónica
- Cambios en configuración de organización
- Cualquier operación definida en `API_SPEC.md` con **Audit: sí**

### 27.4 No duplicar

Un evento de seguridad puede generar también un audit log si la operación lo requiere, pero no se duplican registros innecesarios.

Ejemplo:
- `PASSWORD_CHANGED` genera Security Event.
- No genera Audit Log adicional a menos que exista una regla de negocio específica.

---

## 28. API Authorization Matrix

### 28.1 Convenciones

| Columna | Descripción |
|---|---|
| Method | Verbo HTTP |
| Path | Ruta del endpoint |
| Auth | `public` o `required` |
| Permission | Permiso requerido |
| Tenant Scope | `yes` si requiere aislamiento |
| Resource Check | Validación adicional de propiedad |
| Audit | `yes` / `no` |

### 28.2 Auth Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | public | — | no | — | yes |
| POST | `/auth/logout` | required | — | yes | own session | yes |
| POST | `/auth/refresh` | required | — | yes | own refresh token | yes |
| POST | `/auth/forgot-password` | public | — | no | — | yes |
| POST | `/auth/reset-password` | public | — | no | — | yes |
| POST | `/auth/change-password` | required | — | yes | own account | yes |
| GET | `/auth/me` | required | — | yes | own profile | no |
| GET | `/auth/sessions` | required | — | yes | own sessions | no |
| DELETE | `/auth/sessions/:sessionId` | required | — | yes | own session | yes |
| POST | `/auth/sessions/logout-all` | required | — | yes | own sessions | yes |

### 28.3 MFA Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| POST | `/auth/mfa/enroll` | required | `mfa:manage` | yes | own account | yes |
| POST | `/auth/mfa/verify` | required | `mfa:manage` | yes | own account | yes |
| POST | `/auth/mfa/disable` | required | `mfa:manage` | yes | own account | yes |
| POST | `/auth/mfa/recovery-codes/regenerate` | required | `mfa:manage` | yes | own account | yes |
| GET | `/auth/mfa/status` | required | `mfa:read` | yes | own account | no |

### 28.4 Users Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/users` | required | `users:read` | yes | tenant filter | no |
| POST | `/users` | required | `users:create` | yes | — | yes |
| GET | `/users/:id` | required | `users:read` | yes | same tenant | no |
| PATCH | `/users/:id` | required | `users:update` | yes | same tenant | yes |
| POST | `/users/:id/activate` | required | `users:activate` | yes | same tenant | yes |
| POST | `/users/:id/deactivate` | required | `users:deactivate` | yes | same tenant | yes |
| POST | `/users/:id/roles` | required | `users:assignRoles` | yes | same tenant | yes |
| GET | `/users/:id/permissions` | required | `users:read` | yes | same tenant | no |

### 28.5 Roles & Permissions Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/roles` | required | `roles:read` | yes | tenant filter | no |
| POST | `/roles` | required | `roles:create` | yes | — | yes |
| GET | `/roles/:id` | required | `roles:read` | yes | same tenant | no |
| PATCH | `/roles/:id` | required | `roles:update` | yes | same tenant | yes |
| POST | `/roles/:id/deactivate` | required | `roles:deactivate` | yes | same tenant | yes |
| GET | `/roles/:id/permissions` | required | `roles:read` | yes | same tenant | no |
| POST | `/roles/:id/permissions` | required | `roles:update` | yes | same tenant | yes |
| DELETE | `/roles/:id/permissions/:permissionId` | required | `roles:update` | yes | same tenant | yes |
| GET | `/permissions` | required | `permissions:read` | no | — | no |

### 28.6 Organization Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/organization` | required | `organization:read` | yes | own org | no |
| PATCH | `/organization` | required | `organization:update` | yes | own org | yes |
| GET | `/organization/settings` | required | `organization:read` | yes | own org | no |
| PATCH | `/organization/settings` | required | `organization:updateSettings` | yes | own org | yes |
| GET | `/organization/standards` | required | `organization:read` | yes | own org | no |
| POST | `/organization/standards` | required | `organization:updateStandards` | yes | own org | yes |
| PATCH | `/organization/standards/:standardId` | required | `organization:updateStandards` | yes | own org | yes |

### 28.7 Departments Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/departments` | required | `departments:read` | yes | tenant filter | no |
| POST | `/departments` | required | `departments:create` | yes | — | yes |
| GET | `/departments/:id` | required | `departments:read` | yes | same tenant | no |
| PATCH | `/departments/:id` | required | `departments:update` | yes | same tenant | yes |
| POST | `/departments/:id/deactivate` | required | `departments:deactivate` | yes | same tenant | yes |

### 28.8 Areas Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/areas` | required | `areas:read` | yes | tenant filter | no |
| POST | `/areas` | required | `areas:create` | yes | — | yes |
| GET | `/areas/:id` | required | `areas:read` | yes | same tenant | no |
| PATCH | `/areas/:id` | required | `areas:update` | yes | same tenant | yes |
| POST | `/areas/:id/deactivate` | required | `areas:deactivate` | yes | same tenant | yes |

### 28.9 File Assets Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| POST | `/file-assets/upload-url` | required | `files:upload` | yes | — | yes |
| POST | `/file-assets/confirm` | required | `files:upload` | yes | — | yes |
| GET | `/file-assets/:id/download-url` | required | depends on resource | yes | same tenant + resource permission | yes |
| GET | `/file-assets` | required | `files:read` | yes | tenant filter | no |

### 28.10 Processes Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/processes` | required | `processes:read` | yes | tenant filter | no |
| POST | `/processes` | required | `processes:create` | yes | — | yes |
| GET | `/processes/:id` | required | `processes:read` | yes | same tenant | no |
| PATCH | `/processes/:id` | required | `processes:update` | yes | same tenant | yes |
| POST | `/processes/:id/deactivate` | required | `processes:deactivate` | yes | same tenant | yes |

### 28.11 Standards Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/standards` | required | `standards:read` | no | — | no |
| GET | `/standards/:id` | required | `standards:read` | no | — | no |
| GET | `/standards/:id/requirements` | required | `standards:read` | no | — | no |
| POST | `/organization/standards` | required | `organization:updateStandards` | yes | own org | yes |
| PATCH | `/organization/standards/:standardId` | required | `organization:updateStandards` | yes | own org | yes |

### 28.12 Health Endpoints

| Method | Path | Auth | Permission | Tenant Scope | Resource Check | Audit |
|---|---|---|---|---|---|---|
| GET | `/health` | public | — | no | — | no |
| GET | `/health/live` | public | — | no | — | no |
| GET | `/health/ready` | public | — | no | — | no |

---

## 29. Session Revocation Matrix

| Evento | Session revoked? | Refresh tokens revoked? | MFA affected? | Audit? | Security Event? |
|---|---|---|---|---|---|
| Logout individual | Sí (la actual) | Sí (token usado) | No | Sí | Sí |
| Logout all | Sí (todas) | Sí (todos del usuario) | No | Sí | Sí |
| Password change | Sí (todas) | Sí (todos del usuario) | No | Sí | Sí |
| Password reset | Sí (todas) | Sí (todos del usuario) | No | Sí | Sí |
| Account lock | Sí (todas) | Sí (todos del usuario) | No | Sí | Sí |
| Role change | No | Sí (todos del usuario) | No | Sí | Sí |
| MFA disable | No | Sí (todos del usuario) | Sí (eliminado) | Sí | Sí |
| MFA compromise | Sí (todas) | Sí (todos del usuario) | Sí (regenerado) | Sí | Sí |
| Token reuse detected | Sí (todas) | Sí (familia completa) | No | Sí | Sí |
| Suspicious activity | Sí (todas) | Sí (todos del usuario) | No | Sí | Sí |
| Admin revocation | Sí (específica) | Sí (específico) | No | Sí | Sí |

---

## 30. Auth Failure Matrix

| Failure | HTTP Status | Public Message | Internal Event | Audit |
|---|---|---|---|---|
| Missing/invalid token | 401 | "Unauthorized." | `LOGIN_FAILED` | yes |
| Expired token | 401 | "Token expired." | — | no |
| Invalid credentials | 401 | "Invalid credentials." | `LOGIN_FAILED` | yes |
| MFA required | 401 | "MFA required." | `MFA_FAILED` | yes |
| Invalid MFA code | 401 | "Invalid MFA code." | `MFA_FAILED` | yes |
| Account locked | 403 | "Account locked." | `ACCOUNT_LOCKED` | yes |
| Account inactive | 403 | "Account inactive." | — | yes |
| Insufficient permissions | 403 | "Forbidden." | `PERMISSION_DENIED` | yes |
| Tenant mismatch | 403 | "Forbidden." | `PERMISSION_DENIED` | yes |
| Rate limit exceeded | 429 | "Too many requests." | — | yes |
| Invalid refresh token | 401 | "Invalid token." | — | yes |
| Token reuse detected | 401 | "Invalid token." | `TOKEN_REUSE_DETECTED` | yes |

**Regla anti-enumeración:** Nunca se revela si el email existe. El mensaje público es genérico para credenciales inválidas.

---

## 31. Implementation Boundaries

### 31.1 Auth Module

Responsabilidades:
- Login/logout/refresh
- Password hashing y validación
- Password reset tokens
- Sesiones y refresh tokens
- Security events de autenticación
- Rate limiting para endpoints de auth

No incluye:
- Reglas de negocio de dominio
- Validación de entidades específicas (documentos, etc.)

### 31.2 Authorization Module

Responsabilidades:
- RBAC: UserRole, Role, Permission
- Cálculo de permisos efectivos
- Cache de permisos (`authz:{orgId}:{userId}`)
- Guards y decorators conceptuales
- Validación de `resource:action`

No incluye:
- Lógica de negocio específica del dominio
- Tenant resolution (eso es Auth)

### 31.3 User Module

Responsabilidades:
- CRUD de usuarios
- Activación/desactivación
- Asignación de roles
- Perfil de usuario

Depende de:
- Auth para validación de identidad
- Authorization para permisos

### 31.4 Organization Module

Responsabilidades:
- Configuración de organización
- Estándares adoptados
- Settings

Depende de:
- Auth para tenant context
- Authorization para permisos

### 31.5 Domain Layer

Contiene:
- Reglas de negocio
- Validaciones de estado
- Transiciones de workflow
- Lógica específica de entidades

Depende de:
- Auth para obtener identity
- Authorization para verificar permisos
- User/Organization modules para datos de contexto

### 31.6 Infrastructure Layer

Contiene:
- Prisma Client
- Redis
- JWT signing
- Email service
- Storage service

---

## 32. Cookie vs Bearer

### 32.1 Mecanismo definido por ARCHITECTURE.md

**Bearer JWT** en header `Authorization`.

```http
Authorization: Bearer <access_token>
```

### 32.2 Frontend storage

| Token | Storage recomendado | Justificación |
|---|---|---|
| Access Token | Memoria (variable JS) | Se limpia al cerrar navegador |
| Refresh Token | HttpOnly Secure SameSite Cookie | Protegido contra XSS y CSRF |

### 32.3 Backend cookie settings

```http
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

- `HttpOnly`: no accesible desde JavaScript (XSS protection).
- `Secure`: solo sobre HTTPS.
- `SameSite=Strict`: previene CSRF.
- `Path`: limitado al endpoint de refresh.

### 32.4 CSRF considerations

Si se usan cookies para refresh token:
- `SameSite=Strict` es suficiente para la mayoría de casos.
- Si se requiere `SameSite=None` (cross-site), agregar token CSRF en header.

### 32.5 Bearer alternative

Si el frontend prefiere almacenar refresh token en memoria/localStorage:
- Bearer en body para `/auth/refresh`.
- Riesgo: XSS puede exfiltrar refresh token.
- Mitigación: refresh token lifetime corto (7 días), detección de reúso, revocación inmediata ante sospecha.

No mezclar ambos mecanismos sin una razón clara. Se elige uno por aplicación.

---

## 33. CORS

### 33.1 Configuración

- Orígenes permitidos: solo dominios específicos por ambiente.
- `Access-Control-Allow-Origin`: nunca `*` cuando existan credenciales.
- Credenciales permitidas: `Access-Control-Allow-Credentials: true`.

### 33.2 Headers permitidos

- `Authorization`
- `Content-Type`
- `Idempotency-Key`
- `X-Correlation-ID`

### 33.3 Preflight

- Cachear preflight por 1 hora (`Access-Control-Max-Age`).
- Responder `204` para OPTIONS.

---

## 34. Token Storage

### 34.1 Frontend

| Token | Lugar | Razón |
|---|---|---|
| Access Token | Memoria JS | Se pierde al cerrar pestaña |
| Refresh Token | HttpOnly Cookie | Protegido contra XSS |

No almacenar access token en `localStorage` o `sessionStorage` cuando exista alternativa más segura.

### 34.2 Backend

| Dato | Storage | Formato |
|---|---|---|
| Refresh token | PostgreSQL | SHA-256 hash |
| MFA secret | PostgreSQL | AES-256-GCM encrypted |
| Recovery codes | PostgreSQL | SHA-256 hash |
| Password reset token | PostgreSQL | SHA-256 hash |
| Password hash | PostgreSQL | Argon2id |
| Access token | No persistido | Solo en JWT |

### 34.3 Redis

| Dato | Key | TTL |
|---|---|---|
| Permission cache | `authz:{orgId}:{userId}` | 5 minutos |
| Rate limit counters | `ratelimit:{category}:{key}:{window}` | variable |
| Refresh token blacklist | `token:revoked:{jti}` | hasta `exp` del JWT |

---

## 35. Testing Requirements

### 35.1 Authentication

- [ ] Login success (credenciales válidas, tenant resuelto correctamente)
- [ ] Login failure (credenciales inválidas, mensaje genérico)
- [ ] User enumeration (no revelar existencia de usuario)
- [ ] Account lockout (5 intentos -> bloqueo 30 min)
- [ ] Rate limiting (login, MFA, reset)
- [ ] Token structure (JWT claims válidos, firma verificable)

### 35.2 Token Lifecycle

- [ ] Refresh rotation (token viejo invalidado, nuevo generado)
- [ ] Refresh reuse detection (familia revocada, evento generado)
- [ ] Token revocation (logout, password change)
- [ ] Access token expiration (401 automático)
- [ ] Refresh token expiration (401 con mensaje adecuado)

### 35.3 Sessions

- [ ] List sessions (solo propias, solo activas)
- [ ] Revoke session (logout individual)
- [ ] Revoke all sessions (logout all)
- [ ] Session metadata (IP, user agent, timestamps)

### 35.4 Password

- [ ] Password policy (longitud, complejidad, breached)
- [ ] Password change (requiere password actual)
- [ ] Password reset (flujo completo, token de un solo uso)
- [ ] Password history (no permite últimos 5)
- [ ] Argon2id hashing (parámetros correctos)

### 35.5 MFA

- [ ] TOTP enrollment (secret generado, QR válido)
- [ ] TOTP verification (código válido, ventana de tolerancia)
- [ ] MFA activation (solo tras verificación exitosa)
- [ ] MFA required (login bloqueado sin código)
- [ ] Recovery codes (8 generados, hash almacenado, un solo uso)
- [ ] Recovery code consumption (código eliminado tras uso)
- [ ] MFA disable (requiere password + TOTP/recovery)
- [ ] MFA compromise (regeneración, sesiones cerradas)

### 35.6 Authorization

- [ ] Permission check (documents:read aprobado)
- [ ] Permission denial (documents:read denegado sin permiso)
- [ ] Tenant isolation (usuario A no accede datos de B)
- [ ] Cross-tenant access rechazado (403)
- [ ] Resource ownership (solo dueño puede operar)
- [ ] IDOR (no se puede acceder recurso de otro usuario)
- [ ] Effective permissions (cache actualizado tras cambio de rol)
- [ ] Super admin (no puede acceder tenant sin asignación)

### 35.7 RBAC

- [ ] Role assignment (rol asignado correctamente)
- [ ] Role revocation (rol eliminado, permisos actualizados)
- [ ] Permission cache invalidation (cambio reflejado)
- [ ] Admin cannot self-assign roles
- [ ] System roles protected (no editables)

### 35.8 Edge Cases

- [ ] Concurrent refresh (múltiples dispositivos simultáneos)
- [ ] Refresh during logout (token ya revocado)
- [ ] Expired password reset token
- [ ] MFA with clock skew (ventana de tolerancia)
- [ ] Empty permission set (usuario sin roles)
- [ ] Deactivated user (no puede operar)

---

## 36. Definition of Done

AUTH_SPEC.md estará terminado cuando:

- [x] Login definido.
- [x] Logout definido.
- [x] Refresh definido.
- [x] Token rotation definida.
- [x] Token revocation definida.
- [x] Sessions definidas.
- [x] Password policy definida.
- [x] Password reset definido.
- [x] MFA definido.
- [x] TOTP definido.
- [x] Recovery codes definidos.
- [x] RBAC definido.
- [x] Permissions definidos.
- [x] Tenant context definido.
- [x] Resource authorization definido.
- [x] Privilege escalation definido.
- [x] Rate limiting definido.
- [x] Security events definidos.
- [x] Audit definido.
- [x] API authorization matrix definida.
- [x] Session revocation matrix definida.
- [x] Failure matrix definida.
- [x] Testing requirements definidos.
- [x] No contradice SECURITY.md.
- [x] No contradice API_SPEC.md.
- [x] No contradice DOMAIN.md.
- [x] No contradice DATABASE.md.

---

AUTH_SPEC.md generado. Listo para revisión.
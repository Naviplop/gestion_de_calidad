# QMS Platform — Especificación Maestra de Seguridad

> Documento de seguridad empresarial para QMS Platform.
> Versión: 1.0.0-DRAFT | Fecha: 2026-08-24 | Estado: Definición
> Basado en: ARCHITECTURE.md v1.0.0-DRAFT, DATABASE.md v0.2.0

---

## Tabla de Contenidos (Parcial)

1. [Objetivo](#1-objetivo)
2. [Multi-Tenancy y Aislamiento](#2-multi-tenancy-y-aislamiento)
3. [Authentication](#3-authentication)
4. [MFA](#4-mfa)
5. [RBAC](#5-rbac)
6. [Resource Authorization](#6-resource-authorization)
7. [IDOR Protection](#7-idor-protection)
8. [PostgreSQL RLS](#8-postgresql-rls)
9. [Database Security](#9-database-security)
10. [Password Security](#10-password-security)
11. [Session Security](#11-session-security)
12. [API Security](#12-api-security)
13. [Input Validation](#13-input-validation)
14. [File Security](#14-file-security)
15. [Document Security](#15-document-security)

---

## 1. Objetivo

Definir la arquitectura de seguridad empresarial para QMS Platform. El sistema aplica defensa en profundidad:

```
Frontend
    ↓
API Gateway / Reverse Proxy
    ↓
Authentication
    ↓
Tenant Resolution
    ↓
Authorization
    ↓
Application Services
    ↓
Prisma Middleware
    ↓
PostgreSQL RLS
    ↓
Audit Trail
```

Ninguna capa individual es suficiente. Cada capa debe validar lo que la capa anterior no haya garantizado.

### Principios

- **Seguridad por defecto**: toda operación requiere autenticación y autorización explícita.
- **Principio de menor privilegio**: cada componente solo tiene los permisos estrictamente necesarios.
- **Frontend no confiable**: toda validación de seguridad se replica en backend.
- **Multi-tenancy obligatorio**: el aislamiento entre organizaciones es innegociable.
- **Trazabilidad completa**: toda acción crítica se audita.
- **Inmutabilidad**: el audit log y las versiones documentales no pueden modificarse ni eliminarse.

---

## 2. Multi-Tenancy y Aislamiento

### Modelo: Shared Database + Shared Schema + RLS

QMS Platform utiliza una única base de datos PostgreSQL compartida, con un esquema común y discriminación por `organization_id`. El aislamiento se garantiza mediante tres capas:

1. **Application Tenant Context** (NestJS)
2. **Prisma Middleware**
3. **PostgreSQL RLS**

### 2.1 Determinación del Tenant

El tenant **nunca** se determina a partir del frontend.

**Fuente de verdad**: JWT → payload → `organization_id`.

Flujo:

1. Usuario envía credenciales (`email`, `password`) al endpoint `/auth/login`.
2. Backend busca usuario por email, valida `organization_id` y estado (`is_active`, `is_locked`).
3. Access token se firma con: `{ sub: userId, org: organizationId, roles: [...], permissionsHash: "..." }`.
4. Refresh token se almacena en base de datos/Redis vinculado a `userId` y `organizationId`.

**Regla estricta**: en ningún endpoint tenant-scoped se acepta `organization_id` en el payload. El backend lo extrae exclusivamente del JWT verificado.

### 2.2 Propagación del Tenant Context

En NestJS:

- Un `Guard` (`JwtAuthGuard`) valida el JWT y extrae `organizationId`.
- Un `Interceptor` o `Middleware` inyecta el contexto en `RequestContext`.
- Un `Prisma Middleware` adjunta automáticamente `{ organizationId: ctx.organizationId }` a toda query.

```typescript
// Conceptual Prisma middleware
prisma.$use(async (params, next) => {
  if (isTenantScopedModel(params.action)) {
    params.args.where = { ...params.args.where, organizationId: ctx.organizationId };
  }
  return next(params);
});
```

### 2.3 PostgreSQL RLS

RLS actúa como segunda barrera. Si por error la capa de aplicación falla, PostgreSQL impide el acceso cruzado.

Habilitación por tabla:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON documents
  FOR ALL
  TO app_role
  USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

El `current_setting` se establece por conexión al inicio de cada request:

```sql
SET LOCAL app.current_organization_id = 'ORG-UUID';
```

### 2.4 Contexto en Background Jobs

Los jobs no tienen JWT. El tenant context se propaga mediante:

- `BullMQ` / Redis Queue: cada job almacena `organizationId` en su payload.
- Al procesar el job, el worker establece `SET LOCAL app.current_organization_id`.
- Prisma middleware detecta el contexto y aplica el filtro.

**Regla**: un job NUNCA procesa datos de múltiples tenants en una misma ejecución. Si un job debe procesar múltiples tenants, se divide en múltiples ejecuciones.

### 2.5 WebSockets

- La conexión WebSocket requiere autenticación inicial (JWT en query param o primer mensaje).
- El servidor extrae `organizationId` del JWT y lo almacena en la sesión WebSocket.
- Todo mensaje entrante se valida contra el contexto almacenado.
- No se permite cambiar de tenant durante una sesión WebSocket activa.

### 2.6 Tareas Programadas

- Las tareas programadas (`node-cron`, `Agenda`, etc.) operan sobre un tenant específico o sobre todos.
- Si operan sobre todos, iteran tenant por tenant, estableciendo el contexto en cada iteración.
- Nunca ejecutan queries sin filtro de tenant.

### 2.7 Integraciones Externas

- Cada integración externa se autentica con un `api_key` o `service_account`.
- El `service_account` tiene `organization_id` propio y roles específicos.
- Las integraciones no pueden operar sin un tenant asignado.

### 2.8 Prevención de Tenant Leakage

Reglas:

1. Nunca retornar `organization_id` en respuestas a menos que el recurso lo requiera explícitamente.
2. Nunca usar `organization_id` como parte de un ID compuesto expuesto al frontend (ej: `doc-ORG-UUID-123`).
3. Nunca permitir joins cruzados entre tenants en endpoints públicos.
4. Validar en cada servicio que las FKs pertenecen al mismo tenant.

### 2.9 Manejo de Entidades Globales

Las entidades globales (`permissions`, `document_types`, `processes`, `standards`) no tienen `organization_id`. Su acceso está regulado por permisos de sistema, no por tenant context.

Reglas:

- No se aplica RLS a tablas globales.
- No se propaga tenant context al consultar catálogos globales.
- Solo usuarios con permisos de sistema (`system.*`) pueden modificar estas entidades.

---

## 3. Authentication

### 3.1 Mecanismo

Access Token + Refresh Token:

| Token | Propósito | Vida útil | Transporte | Almacenamiento |
|-------|-----------|-----------|------------|----------------|
| Access Token | Autenticación de API | 15 minutos | Response JSON | Memoria frontend (no localStorage) |
| Refresh Token | Renovación de access token | 7 días | HttpOnly Cookie | Base de datos (`refresh_tokens.tokenHash`) |

Access token payload:

```json
{
  "sub": "user-uuid",
  "org": "organization-uuid",
  "roles": ["admin", "approver"],
  "permissionsHash": "sha256-hash",
  "iat": 1690000000,
  "exp": 1690009000,
  "jti": "unique-token-id"
}
```

Refresh token:

- **Naturaleza:** opaco, aleatorio, impredecible.
- **NO es JWT:** no contiene claims estructurados.
- **Longitud:** mínimo 128 bits de entropía.
- **Almacenamiento backend:** únicamente `tokenHash` (SHA-256) en tabla `refresh_tokens`.
- **Nunca se almacena ni devuelve el valor original en texto plano.**

### 3.2 Login

1. Frontend envía `email` + `password` + `mfa_code` (si MFA activo).
2. Backend busca usuario por email, valida `organization_id` y estado (`is_active`, `is_locked`).
3. Valida password con Argon2id.
4. Si MFA activo, valida TOTP o recovery code.
5. Genera access token JWT.
6. Genera refresh token opaco aleatorio.
7. Almacena `tokenHash` en `refresh_tokens` con `userId`, `organizationId`, `userAgent`, `ipAddress`, `expiresAt`.
8. Establece cookie `HttpOnly; Secure; SameSite=Strict` con el refresh token.
9. Retorna access token en response JSON.

El response JSON **no** contiene el refresh token.

### 3.3 Logout

1. Frontend envía `POST /auth/logout`.
2. Backend extrae refresh token de cookie `refreshToken`.
3. Backend busca `tokenHash` en `refresh_tokens`.
4. Backend marca `revokedAt = NOW()`.
5. Backend establece cookie `refreshToken` con expiración pasada.
6. Genera evento de audit log y security event `AUTH_LOGOUT`.

El refresh token **no** se envía en el body del request.

### 3.4 Rotación de Refresh Tokens

Cada uso de refresh token genera uno nuevo.

Flujo:
1. Cliente envía `POST /auth/refresh` con cookie `refreshToken`.
2. Backend extrae refresh token de cookie.
3. Backend calcula `tokenHash` y busca en `refresh_tokens`.
4. Si no existe, está expirado o revocado: rechazar con `401 InvalidToken` / `401 TokenRevoked` / `401 TokenExpired`.
5. Si existe y es válido: invalidar token actual (`revokedAt = NOW()`), crear nuevo refresh token opaco, almacenar su `tokenHash`, establecer nueva cookie.
6. Retornar nuevo access token en response JSON.

El refresh token anterior **no** puede reutilizarse.

### 3.5 Reuse Detection

Si se detecta un refresh token previamente rotado que se está reutilizando:
- Marcar el token como `REUSED`.
- Invalidar **todos** los refresh tokens del usuario (familia completa).
- Cerrar todas las sesiones activas.
- Generar security event `AUTH_REFRESH_REUSE`.
- Registrar incidente en audit log.
- Rechazar refresh y requerir re-autenticación.

### 3.6 Sesiones Múltiples

- Un usuario puede tener múltiples sesiones activas (dispositivos diferentes).
- Cada refresh token representa una sesión.
- El endpoint `/auth/sessions` lista todas las sesiones activas.
- El usuario puede cerrar sesiones individuales o todas.

### 3.7 Cierre Remoto de Sesiones

- `DELETE /auth/sessions/:sessionId` revoca una sesión específica.
- `DELETE /auth/sessions` revoca todas las sesiones excepto la actual.
- Un admin de organización puede revocar sesiones de usuarios de su organización.

### 3.8 Recuperación de Contraseña

1. Usuario solicita reset con email.
2. Backend genera token de reset firmado, con expiración de 1 hora.
3. Se envía email con link que incluye el token.
4. Usuario establece nueva contraseña.
5. Token se invalida después de uso.
6. Se cierran todas las sesiones activas del usuario.

### 3.9 Bloqueo de Cuenta

- Después de 5 intentos fallidos: `failed_login_attempts >= 5`.
- Cuenta se bloquea por 30 minutos: `is_locked = true`, `locked_until = NOW() + 30 minutos`.
- Un admin puede desbloquear manualmente.
- Los intentos fallidos se registran en audit log.

### 3.10 Rate Limiting Login

- 5 intentos por minuto por IP.
- 10 intentos por minuto por email.
- Bloqueo temporal progresivo.

---

## 4. MFA

### 4.1 TOTP

- Algoritmo: RFC 6238.
- Período: 30 segundos.
- Dígitos: 6.
- Ventana de tolerancia: 1 período anterior y posterior (para desfase de reloj).

### 4.2 Enrollment

1. Usuario solicita habilitar MFA.
2. Backend genera secret TOTP aleatorio (16+ caracteres base32).
3. Secret se cifra con AES-256-GCM antes de almacenar.
4. Se genera URL TOTP (`otpauth://totp/...`).
5. Backend retorna URL para QR code y 8 recovery codes.
6. Usuario escanea QR y confirma con código TOTP.
7. Backend valida código y activa `mfa_enabled = true`.

### 4.3 Recovery Codes

- 8 códigos de 10 caracteres alfanuméricos.
- Cada código se hashea con SHA-256 antes de almacenar.
- Un código solo puede usarse una vez.
- Al usar un recovery code, se elimina del array.
- Si se usan todos, se fuerza regeneración.

### 4.4 Validación MFA en Login

1. Usuario envía email + password.
2. Si `mfa_enabled = true`, se requiere `mfa_code` o recovery code.
3. Backend valida código TOTP con secret descifrado.
4. Si es recovery code, se busca en array de hashes.
5. Si es válido, se procede a generar tokens.

### 4.5 Regeneración

- Usuario puede regenerar recovery codes desde su perfil.
- Se invalidan todos los códigos anteriores.
- Se genera un nuevo set.

### 4.6 Revocación

- Usuario puede deshabilitar MFA desde su perfil (requiere password + código TOTP).
- Admin puede deshabilitar MFA de usuarios de su organización (requiere justificación y se audita).

### 4.7 Cambio de Dispositivo

- No requiere flujo especial. El usuario escanea el QR en el nuevo dispositivo.
- El secret TOTP se mantiene; el usuario puede tener el mismo secret en múltiples dispositivos.

### 4.8 Pérdida de Dispositivo

- Usuario usa recovery codes.
- Si no tiene recovery codes, admin deshabilita MFA.
- Se recomienda forzar re-enrollment después de deshabilitar MFA por admin.

### 4.9 Auditoría

Eventos MFA auditados:

- `MFA_ENABLED`
- `MFA_DISABLED`
- `MFA_FAILED`
- `RECOVERY_CODE_USED`
- `RECOVERY_CODES_REGENERATED`

---

## 5. RBAC

### 5.1 Modelo

```
User → UserRole → Role → RolePermission → Permission
```

- Un usuario puede tener múltiples roles.
- Un rol puede tener múltiples permisos.
- Los permisos efectivos del usuario son la unión de todos los permisos de sus roles.
- Los roles son tenant-scoped.

### 5.2 Permisos

Formato: `{recurso}:{acción}`

Ejemplos:

```
documents:read
documents:create
documents:update
documents:delete
documents:submit_review
documents:review
documents:approve
documents:reject
documents:publish
documents:download
documents:obsolete
documents:manage_distribution
documents:acknowledge

audits:read
audits:create
audits:update
audits:execute
audits:close
audits:generate_report

nonconformities:read
nonconformities:create
nonconformities:update
nonconformities:close

corrective_actions:read
corrective_actions:create
corrective_actions:update
corrective_actions:verify
corrective_actions:close

risks:read
risks:manage
risks:assess

trainings:read
trainings:manage
trainings:assign
trainings:evaluate

indicators:read
indicators:manage
indicators:measure

reports:read
reports:generate
reports:export

users:read
users:create
users:update
users:deactivate
roles:manage

organizations:read
organizations:update
organizations:branding

audit_logs:read

system:manage
system:configure
```

### 5.3 Roles Base Sugeridos

| Rol | Permisos base |
|-----|--------------|
| Super Admin | Todos los permisos |
| Admin de Organización | Todos excepto `system:manage` |
| Responsable de Calidad | documents.*, audits.*, nonconformities.*, corrective_actions.*, risks:read, trainings:read, indicators:read, reports:generate |
| Auditor | audits:read, audits:execute, findings:create, audit_evidence:upload, nonconformities:read |
| Aprobador | documents:read, documents:approve, documents:reject, documents:download |
| Responsable de Proceso | documents:read, documents:create, documents:update (sus documentos) |
| Colaborador | documents:read, documents:acknowledge, trainings:read |
| Consulta | documents:read, audits:read, nonconformities:read |

### 5.4 Permisos de Sistema

Permisos que trascienden el tenant:

- `system:manage`: configuración global, gestión de tenants.
- `system:configure`: parámetros de sistema.

Estos permisos solo se asignan a roles especiales y no están disponibles para roles tenant-scoped regulares.

### 5.5 Jerarquía de Roles

- No se implementa herencia automática de roles en primera versión.
- Los permisos se calculan por unión de roles asignados.
- Fases futuras pueden introducir herencia.

### 5.6 Evitar Privilege Escalation

Reglas:

1. Un usuario no puede asignarse roles a sí mismo (`assigned_by != user_id`).
2. Un usuario no puede elevar sus propios permisos.
3. Solo roles con `roles:manage` pueden modificar roles.
4. Los cambios de roles se auditan.
5. Los roles `is_system` no pueden eliminarse ni renombrarse.

### 5.7 Validación

- Se calculan los permisos efectivos en cada request y se cachean en Redis.
- El frontend recibe los permisos efectivos al login para renderizado condicional.
- **El backend nunca confía en los permisos enviados por el frontend**.

---

## 6. Resource Authorization

### 6.1 Modelo

Toda operación requiere:

```
Permission AND
Tenant Ownership AND
Resource State Validation
```

Ejemplo para `documents:approve`:

```typescript
const canApprove = await checkPermission(userId, 'documents:approve');
const document = await prisma.document.findFirst({
  where: { id: documentId, organizationId: user.organizationId }
});
if (!canApprove || !document) throw new ForbiddenException();
if (document.status !== 'PENDING_APPROVAL') throw new BadRequestException('INVALID_STATE');
```

### 6.2 Validación de Estado

Además de permiso y propiedad, se valida que el recurso esté en el estado correcto para la operación:

- `documents:publish` → estado debe ser `APPROVED`.
- `documents:obsolete` → estado debe ser `CURRENT`.
- `nonconformities:close` → estado debe ser `VERIFICATION`.
- `corrective_actions:verify` → estado debe ser `COMPLETED`.

### 6.3 Decoradores NestJS

Se utilizan decoradores para validación automática:

```typescript
@RequirePermission('documents:approve')
@RequireDocumentState(['PENDING_APPROVAL'])
@TenantScoped()
async approveDocument(@Param('id') id: string) { ... }
```

---

## 7. IDOR Protection

### 7.1 Patrón

Todo endpoint que accede a un recurso por ID debe validar:

1. El recurso existe.
2. El recurso pertenece al tenant del usuario autenticado.
3. El usuario tiene el permiso requerido.

Ejemplo conceptual:

```typescript
async function getDocument(documentId: string, user: UserContext) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      organizationId: user.organizationId,
      deletedAt: null
    }
  });
  if (!document) throw new NotFoundException();
  return document;
}
```

### 7.2 Reglas

- Nunca asumir que un UUID válido implica autorización.
- Nunca exponer IDs de recursos de otros tenants en respuestas.
- Nunca permitir joins sin filtrar por `organization_id`.
- En listados, siempre filtrar por `organization_id`.

---

## 8. PostgreSQL RLS

### 8.1 Habilitación

```sql
-- Habilitar RLS en tablas tenant-scoped
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... para cada tabla tenant-scoped
```

### 8.2 Contexto por Conexión

```sql
-- Establecer contexto al inicio de cada transacción
SET LOCAL app.current_organization_id = 'ORG-UUID';
SET LOCAL app.current_user_id = 'USER-UUID';
```

### 8.3 Políticas SELECT

```sql
CREATE POLICY tenant_select_policy ON documents
  FOR SELECT
  TO app_role
  USING (
    organization_id = current_setting('app.current_organization_id')::UUID
    AND deleted_at IS NULL
  );
```

### 8.4 Políticas INSERT

```sql
CREATE POLICY tenant_insert_policy ON documents
  FOR INSERT
  TO app_role
  WITH CHECK (
    organization_id = current_setting('app.current_organization_id')::UUID
  );
```

### 8.5 Políticas UPDATE

```sql
CREATE POLICY tenant_update_policy ON documents
  FOR UPDATE
  TO app_role
  USING (
    organization_id = current_setting('app.current_organization_id')::UUID
  )
  WITH CHECK (
    organization_id = current_setting('app.current_organization_id')::UUID
  );
```

### 8.6 Políticas DELETE

```sql
CREATE POLICY tenant_delete_policy ON documents
  FOR DELETE
  TO app_role
  USING (
    organization_id = current_setting('app.current_organization_id')::UUID
  );
```

### 8.7 Tablas Inmutables

Para tablas que no deben actualizarse ni eliminarse:

```sql
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  TO app_role
  USING (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE
  TO app_role
  USING (false);
```

### 8.8 Tablas Globales

No se habilita RLS en tablas globales (`permissions`, `document_types`, `processes`, `standards`). Su acceso está controlado por permisos de aplicación.

### 8.9 Connection Pooling

- PgBouncer en modo transaction pooling.
- Cada transacción establece `SET LOCAL` al inicio.
- No se comparte contexto entre transacciones.
- El middleware de Prisma ejecuta `SET LOCAL` en cada query si no está establecido.

---

## 9. Database Security

### 9.1 Roles PostgreSQL

| Rol | Propósito | Privilegios |
|-----|-----------|-------------|
| `app_role` | Usuario runtime de la aplicación | SELECT, INSERT, UPDATE, DELETE en tablas tenant-scoped; SELECT en globales |
| `migration_role` | Usuario para migraciones | CREATE, ALTER, DROP |
| `readonly_role` | Usuario para reportes/read replicas | SELECT |
| `backup_role` | Usuario para backups | SELECT + pg_dump |

### 9.2 Least Privilege

- `app_role` no tiene privilegios de DDL.
- `app_role` no puede crear tablas, índices ni roles.
- `migration_role` no tiene privilegios DML en producción.
- `backup_role` solo tiene SELECT.

### 9.3 Acceso desde Red

- PostgreSQL no expone puerto 5432 a internet.
- Acceso únicamente desde:
  - Backend (Docker network)
  - PgBouncer (Docker network)
  - Admin jumpshell (bastion)
- Reglas de firewall restrictivas.

### 9.4 TLS

- Conexiones PostgreSQL obligatorias con TLS 1.2+.
- `sslmode = require` en producción.
- Certificados válidos (no self-signed en producción).

### 9.5 Encryption at Rest

- PostgreSQL con `data_encryption = on` (pgcrypto o native encryption).
- En AWS: EBS encryption.
- En Docker: volume encryption.

### 9.6 Backups Cifrados

- `pg_dump` con cifrado AES-256.
- Clave de cifrado almacenada en secrets manager.
- Backups en almacenamiento separado.

### 9.7 Rotación de Credenciales

- Credenciales de base de datos rotan cada 90 días.
- Redis credentials rotan cada 90 días.
- S3 credentials rotan cada 90 días.
- Se utiliza IAM roles en AWS cuando es posible (evita credenciales estáticas).

---

## 10. Password Security

### 10.1 Algoritmo

- **Argon2id** (ganador Password Hashing Competition 2015).
- Parámetros recomendados para producción:
  - Time Cost: 3
  - Memory Cost: 65536 (64 MB)
  - Parallelism: 4
  - Hash length: 32 bytes
  - Salt length: 16 bytes

### 10.2 Política de Contraseñas

- Mínimo 12 caracteres.
- Mezcla de mayúsculas, minúsculas, números y símbolos.
- No permite passwords comunes (verificación contra lista de 10,000 passwords más comunes).
- No permite passwords que contengan el nombre o email del usuario.
- No permite passwords reutilizados (password history de últimos 5 passwords).
- No expira forzosamente (mejor práctica actual: no forzar expiración, solo en caso de compromiso).

### 10.3 Protección contra Compromiso

- Verificación contra Have I Been Pwned API (k-anonymity) en enrollment/cambio de password.
- Bloqueo inmediato si el password aparece en breach.

### 10.4 Almacenamiento

- Solo se almacena el hash Argon2id.
- Nunca texto plano.
- Nunca reversible encryption.

---

## 11. Session Security

### 11.1 Ciclo de Vida

| Token | Duración | Renovación |
|-------|----------|------------|
| Access Token | 15 minutos | No |
| Refresh Token | 7 días | Sí (rotación) |

### 11.2 Refresh Token Rotation

- Cada refresh genera nuevo refresh token.
- El anterior se invalida inmediatamente.
- Si se detecta reuse de refresh token revocado:
  - Se invalidan todos los refresh tokens del usuario.
  - Se cierran todas las sesiones activas.
  - Se audita evento `TOKEN_REUSE_DETECTED`.

### 11.3 Inactividad

- Access token: 15 minutos sin uso se considera expirado.
- Refresh token: 7 días sin uso se considera expirado.
- No hay concepto de "inactividad" adicional para refresh token (se maneja por expiración natural).

### 11.4 Máximo Lifetime

- Sesión máxima de 7 días (vida del refresh token).
- Admin puede forzar logout de sesiones específicas.
- No hay límite de sesiones simultáneas por defecto.

### 11.5 Device Tracking

- Cada sesión registra: `user_agent`, `ip_address`, `created_at`, `last_used_at`.
- El usuario puede ver sus sesiones activas.
- El usuario puede revocar sesiones individuales.

### 11.6 Sesiones Sospechosas

- Se marca como sospechosa si:
  - IP de país diferente al habitual (si hay histórico).
  - User agent completamente nuevo.
- No se bloquea automáticamente, pero se notifica al usuario.

---

## 12. API Security

### 12.1 HTTPS

- Toda comunicación requiere HTTPS en producción.
- HSTS con max-age de 1 año.
- No se sirve contenido mixto.

### 12.2 CORS

- `Access-Control-Allow-Origin`: origen específico por entorno (no `*`).
- `Access-Control-Allow-Credentials`: `true` (necesario para cookies HttpOnly).
- `Access-Control-Allow-Methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, X-CSRF-Token, X-Correlation-ID`.
- `Access-Control-Max-Age`: `86400`.

### 12.3 CSRF

- No aplica para API REST con Bearer tokens.
- Aplica para endpoints que usan cookies (`refresh_token`).
- Para endpoints con cookies: `SameSite=Strict` + header `X-CSRF-Token` (doble submit).
- El frontend obtiene el CSRF token de una cookie `csrf_token` y lo envía en header.

### 12.4 Security Headers

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:;
```

### 12.5 Request Validation

- DTOs con `class-validator`.
- `whitelist: true` (elimina propiedades no definidas en DTO).
- `forbidNonWhitelisted: true` (rechaza requests con propiedades extra).
- Límites de tamaño:
  - JSON body: 1 MB
  - Query params: 10 KB
  - URL: 2048 caracteres

### 12.6 Rate Limiting

Implementado con `@nestjs/throttler` + Redis:

- Global: 100 requests por minuto por IP.
- Login: 5 requests por minuto por IP + 10 por email.
- MFA: 5 intentos por minuto.
- Password reset: 3 requests por minuto por email.
- File upload: 10 uploads por minuto por usuario.
- Export: 5 exports por minuto por usuario.

### 12.7 API Versioning

- Versionado por URL: `/api/v1/...`.
- No se soportan versiones antiguas indefinidamente. Ciclo de vida:
  - Deprecation header: `Sunset: Sat, 31 Dec 2026 23:59:59 GMT`.
  - 6 meses de gracia después de deprecation.

### 12.8 Paginación

- Límite máximo: 100 registros por página.
- Default: 20 registros.
- Offset no mayor a 10,000 (prevenir deep pagination).
- Para listados grandes, preferir keyset pagination.

### 12.9 Error Handling

- Nunca retornar stack traces.
- Nunca retornar mensajes de error de base de datos.
- Nunca retornar detalles de infraestructura.
- Estructura de error uniforme:

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found",
    "correlationId": "..."
  }
}
```

---

## 13. Input Validation

### 13.1 Validación por Capa

1. **NestJS Pipes**: validación de DTOs con `class-validator`.
2. **Zod schemas**: validación adicional en servicios críticos.
3. **Prisma**: validación de tipos en cliente.
4. **PostgreSQL**: constraints a nivel de base de datos.

### 13.2 Validación por Tipo

| Tipo | Validación |
|------|-----------|
| JSON body | Schema validation + whitelist |
| Query params | Tipo, rango, longitud máxima |
| Path params | UUID format |
| Headers | Formato, longitud |
| Multipart | MIME type, tamaño, magic bytes |
| Filenames | Sanitización, max 255 chars, sin caracteres especiales |
| URLs | Validación de esquema (http/https), bloqueo de localhost/RFC1918 |
| Rich text | Sanitización HTML, CSP |

### 13.3 Protecciones

- **SQL Injection**: Prisma ORM parameteriza queries. No se concatenan strings en queries.
- **XSS**: React escapa por defecto. Para rich text, sanitización con `DOMPurify`.
- **SSRF**: Bloqueo de localhost, RFC1918, metadata endpoints en funciones que hacen requests externos.
- **Path Traversal**: No se accede a filesystem basado en input del usuario. S3 object keys son generados por backend.
- **Command Injection**: No se ejecutan comandos del sistema basados en input del usuario.
- **Prototype Pollution**: Validación estricta de objetos JSON. No se usa `merge` o `assign` sin whitelist.

---

## 14. File Security

### 14.1 Bucket

- Bucket privado por defecto.
- Ningún objeto público.
- Acceso exclusivamente mediante signed URLs.

### 14.2 Upload Flow

1. Frontend solicita `Presigned PUT URL` al backend.
2. Backend valida:
   - Usuario autenticado.
   - Permiso `files:upload` o permiso específico del módulo.
   - MIME type permitido.
   - Tamaño máximo (configurable por organización).
   - Cantidad de archivos en periodo (rate limit).
3. Backend genera `storage_key` único (no utiliza el nombre original).
4. Backend retorna `Presigned PUT URL` con expiración de 5 minutos.
5. Frontend sube archivo directamente a S3/MinIO.
6. Frontend notifica finalización al backend.
7. Backend descarga archivo temporal, calcula SHA-256, valida MIME y tamaño.
8. Backend crea registro en `file_assets` y, si aplica, lo vincula a la entidad.

### 14.3 Download Flow

1. Frontend solicita descarga.
2. Backend valida:
   - Usuario autenticado.
   - Permiso de descarga sobre el recurso.
   - Tenant ownership.
3. Backend genera `Presigned GET URL` con expiración de 5 minutos.
4. Backend registra evento en `audit_logs`.

### 14.4 Object Key Generation

- Formato: `tenants/{organization_id}/{module}/{entity_id}/{uuid}.{ext}`
- Ejemplo: `tenants/550e8400-e29b-41d4-a716-446655440000/documents/660e8400-e29b-41d4-a716-446655440001/a1b2c3d4.pdf`
- Nunca se expone el nombre original del archivo en el object key.

### 14.5 Validación

- **MIME type**: validación del header `Content-Type` del upload y del archivo descargado.
- **Magic bytes**: validación de firma de archivo (primeros bytes).
- **Tamaño máximo**: 50 MB por defecto (configurable).
- **Extensiones permitidas**: lista blanca por tipo de documento.

### 14.6 Antivirus

- En producción: ClamAV o solución equivalente en pipeline de upload.
- En desarrollo: omitir o simular.
- Archivos infectados se rechazan y se audita.

### 14.7 Audit

Todo acceso a archivos se audita:

- `UPLOAD_DOCUMENT`
- `DOWNLOAD_DOCUMENT`
- `DELETE_DOCUMENT` (soft delete del asset)

---

## 15. Document Security

### 15.1 Ciclo de Vida

| Estado | Permisos efectivos |
|--------|-------------------|
| DRAFT | Solo creador y roles con `documents:update` |
| IN_REVIEW | Revisores pueden comentar; creador puede corregir |
| PENDING_APPROVAL | Aprobadores pueden aprobar/rechazar |
| APPROVED | Solo lectura |
| PUBLISHED | Lectura + descarga para destinatarios |
| CURRENT | Lectura + confirmación de lectura |
| OBSOLETE | Solo lectura (histórico) |
| CANCELLED | Solo lectura para auditores |

### 15.2 Protecciones

- **Versiones históricas**: no editables, no eliminables.
- **Eliminación**: soft delete exclusivamente. `deleted_at` marca eliminación.
- **Descarga**: requiere permiso `documents:download` y tenant ownership.
- **Sustitución de archivos**: prohibida. Nueva versión = nuevo `file_asset`.
- **Acceso cross-tenant**: impedido por RLS + Prisma middleware.

### 15.3 Firma Electrónica

- La firma de un documento no altera el documento original.
- La firma se registra como evento independiente con hash del documento.
- Cualquier modificación posterior del documento invalida la firma (hash mismatch).

---

## 16. Electronic Signature

### 16.1 Naturaleza

Firma/confirmación electrónica interna. No constituye firma electrónica avanzada ni cualificada.

### 16.2 Datos Registrados

| Campo | Propósito |
|-------|-----------|
| `user_id` | Identidad del firmante |
| `action` | Acción firmada (ej: "APROBAR_DOCUMENTO") |
| `entity_type` | Tipo de entidad (Document, CorrectiveAction) |
| `entity_id` | ID de la entidad |
| `document_hash` | SHA-256 del documento en el momento de la firma |
| `event_hash` | SHA-256 del evento de firma (hash chaining) |
| `ip_address` | IP del firmante |
| `user_agent` | User agent del firmante |
| `authentication_method` | TOTP, PASSWORD, SSO |
| `signed_at` | Timestamp de la firma |

### 16.3 Inmutabilidad

- `electronic_signature_events` es append-only.
- No UPDATE, no DELETE desde aplicación.
- RLS policies restrictivas.

### 16.4 Detección de Alteraciones

- `document_hash` permite detectar si el documento original cambió después de la firma.
- `event_hash` permite detectar manipulación del registro de firma.
- En fases futuras: integración con proveedor de firma electrónica avanzada.

---

## 17. Audit Log Security

### 17.1 Naturaleza

Append-only, inmutable, hash-chained, tenant-scoped.

### 17.2 Eventos Auditables

Mínimo:

- `LOGIN_SUCCESS`, `LOGIN_FAILED`
- `LOGOUT`
- `PASSWORD_CHANGED`, `PASSWORD_RESET`
- `MFA_ENABLED`, `MFA_DISABLED`, `MFA_FAILED`
- `TOKEN_REFRESH`, `TOKEN_REVOKED`
- `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`
- `PERMISSION_DENIED`, `CROSS_TENANT_ATTEMPT`
- `USER_CREATED`, `USER_UPDATED`, `USER_DEACTIVATED`
- `ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`
- `PERMISSION_ASSIGNED`, `PERMISSION_REVOKED`
- `DOCUMENT_CREATED`, `DOCUMENT_UPDATED`, `DOCUMENT_DELETED`
- `DOCUMENT_VERSION_CREATED`
- `DOCUMENT_REVIEWED`, `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`
- `DOCUMENT_PUBLISHED`, `DOCUMENT_ACKNOWLEDGED`
- `DOCUMENT_DOWNLOADED`
- `AUDIT_CREATED`, `AUDIT_UPDATED`, `AUDIT_CLOSED`
- `FINDING_CREATED`, `FINDING_UPDATED`
- `NONCONFORMITY_CREATED`, `NONCONFORMITY_CLOSED`
- `CORRECTIVE_ACTION_CREATED`, `CORRECTIVE_ACTION_COMPLETED`
- `RISK_CREATED`, `RISK_UPDATED`
- `ELECTRONIC_SIGNATURE_CREATED`
- `CONFIGURATION_CHANGED`
- `FILE_UPLOADED`, `FILE_DELETED`

### 17.3 Datos Registrados

| Campo | Propósito |
|-------|-----------|
| `organization_id` | Tenant del evento |
| `actor_id` | Usuario que realizó la acción |
| `action` | Código del evento |
| `entity_type` | Tipo de entidad afectada |
| `entity_id` | ID de la entidad |
| `old_values` | JSONB con valores anteriores |
| `new_values` | JSONB con valores nuevos |
| `ip_address` | IP del actor |
| `user_agent` | User agent del actor |
| `request_id` | Correlation ID de la request |
| `previous_hash` | Hash del evento anterior |
| `event_hash` | Hash del evento actual |
| `result` | SUCCESS / FAILURE |
| `created_at` | Timestamp |

### 17.4 Inmutabilidad

- No UPDATE.
- No DELETE desde aplicación.
- RLS policies que bloquean UPDATE y DELETE.
- Solo servicio de migración con rol especial puede modificar (solo para corrección de errores de migración, no en producción).

---

## 18. Hash Chain

### 18.1 Definición

```text
event_hash = SHA-256(
  canonical_event_payload
  + previous_hash
)
```

### 18.2 Canonicalización

El payload canónico incluye, en orden fijo:

```
organization_id
actor_id
action
entity_type
entity_id
old_values
new_values
ip_address
user_agent
request_id
previous_hash
timestamp
```

Serialización:

- JSON compacto (sin espacios).
- Campos ordenados alfabéticamente.
- Strings entre comillas dobles.
- Números sin relleno.
- `null` como `null`.

### 18.3 Genesis Event

- Primer evento de una organización: `previous_hash = '0000000000000000000000000000000000000000000000000000000000000000'`.

### 18.4 Validación

- Al leer audit logs, se valida que `event_hash` coincida con el hash calculado del payload canónico + `previous_hash`.
- Si cualquier evento falla la validación, se genera alerta de seguridad.
- La validación puede ejecutarse como job programado.

---

## 19. Security Events

### 19.1 Catálogo de Eventos

| Evento | Categoría | Descripción |
|--------|-----------|-------------|
| `LOGIN_SUCCESS` | Auth | Login exitoso |
| `LOGIN_FAILED` | Auth | Login fallido |
| `LOGOUT` | Auth | Logout |
| `PASSWORD_CHANGED` | Auth | Cambio de contraseña |
| `PASSWORD_RESET` | Auth | Reset de contraseña |
| `MFA_ENABLED` | Auth | MFA activado |
| `MFA_DISABLED` | Auth | MFA desactivado |
| `MFA_FAILED` | Auth | Fallo MFA |
| `TOKEN_REFRESH` | Auth | Refresh token usado |
| `TOKEN_REVOKED` | Auth | Token revocado |
| `ACCOUNT_LOCKED` | Auth | Cuenta bloqueada |
| `ACCOUNT_UNLOCKED` | Auth | Cuenta desbloqueada |
| `PERMISSION_DENIED` | Auth | Permiso denegado |
| `CROSS_TENANT_ATTEMPT` | Security | Intento de acceso cross-tenant |
| `SUSPICIOUS_ACTIVITY` | Security | Actividad sospechosa |
| `TOKEN_REUSE_DETECTED` | Security | Reuso de refresh token |
| `FILE_UPLOADED` | File | Archivo subido |
| `FILE_DELETED` | File | Archivo eliminado |
| `DOCUMENT_DOWNLOADED` | Document | Documento descargado |
| `ELECTRONIC_SIGNATURE_CREATED` | Signature | Firma creada |
| `CONFIGURATION_CHANGED` | System | Configuración modificada |

### 19.2 Correlación

- Todo evento de seguridad incluye `request_id` para correlación con logs de aplicación.
- Los eventos de seguridad se consultan preferentemente por `request_id` para reconstruir secuencias.

---

## 20. Rate Limiting

### 20.1 Estrategia

Se utiliza `@nestjs/throttler` + Redis para límites distribuidos.

### 20.2 Límites

| Recurso | Límite | Ventana | Clave |
|---------|--------|---------|-------|
| Login | 5 requests | 1 minuto | IP + email |
| MFA | 5 intentos | 1 minuto | IP + email |
| Password reset | 3 requests | 1 minuto | email |
| API global | 100 requests | 1 minuto | IP |
| Refresh token | 10 requests | 1 minuto | IP + user_id |
| File upload | 10 uploads | 1 minuto | user_id |
| Export | 5 exports | 1 minuto | user_id |

### 20.3 Respuesta

Cuando se excede el límite:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "correlationId": "..."
  }
}
```

### 20.4 Redis

- Clave: `rate_limit:{clave}`.
- TTL igual a la ventana.
- Redis es fuente de verdad para rate limiting distribuido.
- Si Redis no está disponible, se aplica fallback conservador (bloquear requests).

---

## 21. Redis Security

### 21.1 Consideraciones

Redis es infraestructura interna. Nunca se expone a internet.

### 21.2 Medidas

- **Autenticación**: `requirepass` en configuración.
- **TLS**: conexiones cifradas en producción.
- **ACL**: usuario dedicado con permisos mínimos.
- **Network isolation**: solo accesible desde Docker network.
- **Key naming**: `qms:{tenant_id}:{module}:{resource}`.
- **TTL**: todas las claves tienen TTL excepto listas estructuradas.
- **No secretos**: no almacenar tokens, passwords ni MFA secrets en Redis.
- **Namespaces**: separación lógica por tipo de dato (cache, rate_limit, sessions).

### 21.3 Backups

- Redis no es fuente de verdad.
- No requiere backup permanente.
- Pérdida de Redis = pérdida de cache y rate limiting, no de datos críticos.

---

## 22. Secrets Management

### 22.1 Principios

- Nunca en Git.
- Nunca en código fuente.
- Nunca en Docker image.
- Nunca en logs.
- Separación por entorno.

### 22.2 Desarrollo

- Archivo `.env` local (ignorado en Git).
- `.env.example` con placeholders.
- Secrets de baja sensibilidad.

### 22.3 Staging/Production

- Secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.).
- Inyección en runtime.
- Rotación automática cuando sea posible.

### 22.3 Secretos Requeridos

| Secreto | Propósito | Rotación |
|---------|-----------|----------|
| `JWT_SECRET` | Firma de access tokens | 90 días |
| `DATABASE_URL` | Conexión PostgreSQL | 90 días |
| `REDIS_URL` | Conexión Redis | 90 días |
| `S3_ACCESS_KEY` | Object Storage | 90 días |
| `S3_SECRET_KEY` | Object Storage | 90 días |
| `SMTP_HOST` | Email | 90 días |
| `SMTP_USER` | Email | 90 días |
| `SMTP_PASSWORD` | Email | 90 días |
| `MFA_ENCRYPTION_KEY` | Cifrado de secrets TOTP | 180 días |
| `ENCRYPTION_KEY` | Cifrado general | 180 días |

### 22.4 Rotación

- Procedimiento documentado.
- Sin downtime.
- Validación post-rotación.
- Rollback plan.

---

## 23. Logging Security

### 23.1 Qué Registrar

- Eventos de seguridad.
- Acciones críticas.
- Errores de aplicación.
- Requests HTTP (método, path, status, latency).
- Eventos de negocio relevantes.

### 23.2 Qué NO Registrar

- Passwords.
- Access tokens.
- Refresh tokens.
- MFA secrets.
- Recovery codes.
- Authorization headers completos.
- Información sensible innecesaria.

### 23.3 Redaction

```typescript
const redact = (obj: any, fields: string[]) => {
  const clone = { ...obj };
  fields.forEach(f => delete clone[f]);
  return clone;
};
```

Campos sensibles a redactar:

- `password`
- `password_hash`
- `mfa_secret`
- `mfa_backup_codes`
- `token`
- `refresh_token`
- `authorization`
- `secret`
- `key`

### 23.4 Structured Logging

- JSON estructurado.
- Campos obligatorios: `timestamp`, `level`, `message`, `correlationId`, `organizationId`, `userId`.
- Sin PII innecesario.

---

## 24. Error Handling

### 24.1 Principios

- Errores externos seguros.
- Sin enumeración de usuarios.
- Sin detalles de infraestructura.
- Correlación con logs internos.

### 24.2 Estructura

```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found",
    "correlationId": "8f3b2a1c-9d4e-4f5a-8b1c-2d3e4f5a6b7c",
    "timestamp": "2026-08-24T11:00:00Z"
  }
}
```

### 24.3 Reglas

- NO: "User john@example.com does not exist."
- SÍ: "Invalid credentials."
- NO: "SQL syntax error near 'X'."
- SÍ: "Invalid request."
- NO: "Stack trace..."
- SÍ: Error code + correlation ID.

### 24.4 Internal Logging

- Log interno con detalles completos del error.
- Correlation ID permite buscar el error en logs internos.
- No se expone al cliente.

---

## 25. Security Headers

### 25.1 Headers Obligatorios

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:;
```

### 25.2 Observaciones

- `X-XSS-Protection`: obsoleto en navegadores modernos, no incluirlo.
- `Public-Key-Pins`: obsoleto, no incluirlo.
- CSP se ajusta según necesidades del frontend.

---

## 26. CORS

### 26.1 Configuración por Entorno

| Entorno | Origen | Credentials |
|---------|--------|-------------|
| Desarrollo | `http://localhost:5173` | Sí |
| Staging | `https://staging.qms.app` | Sí |
| Producción | `https://app.qms.com` | Sí |

### 26.2 Reglas

- `Access-Control-Allow-Origin`: origen específico (no `*`).
- `Access-Control-Allow-Credentials`: `true`.
- `Access-Control-Allow-Methods`: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, X-CSRF-Token, X-Correlation-ID`.
- `Access-Control-Max-Age`: `86400`.

---

## 27. CSRF

### 27.1 Aplicabilidad

- API REST con Bearer tokens: no aplica CSRF tradicional.
- Endpoints con cookies (`refresh_token`): aplica CSRF.

### 27.2 Mitigación para Cookies

- `SameSite=Strict` en cookies de refresh token.
- Doble submit cookie: cookie `csrf_token` + header `X-CSRF-Token`.
- Frontend lee cookie y envía header en cada request con cookie.

### 27.3 Regla

No implementar CSRF para endpoints que usan exclusivamente Bearer tokens en Authorization header.

---

## 28. XSS

### 28.1 Protección Frontend

- React escapa contenido por defecto.
- Nunca usar `dangerouslySetInnerHTML` sin sanitización previa.
- Para rich text: `DOMPurify` + CSP estricta.

### 28.2 Protección Backend

- Nunca retornar HTML sin sanitizar.
- Si se permite HTML en campos de texto, sanitizar antes de almacenar.
- CSP en headers.

### 28.3 Manejo de Rich Text

- Si se implementa editor rich text, debe sanitizar el HTML antes de guardar.
- Lista blanca de tags y attributes permitidos.
- Bloqueo de scripts, eventos inline, etc.

---

## 29. SSRF

### 29.1 Riesgo

Funcionalidades que hacen requests HTTP basados en input del usuario (ej: preview de URLs, webhooks).

### 29.2 Mitigación

- **Allowlist**: solo dominios permitidos.
- **Bloquear localhost**: `127.0.0.0/8`, `::1`.
- **Bloquear RFC1918**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- **Bloquear metadata endpoints**: `169.254.169.254` (AWS), metadata Google Cloud, etc.
- **DNS rebinding**: resolver DNS y validar IP antes de hacer request.
- **Redirects**: seguir redirects solo a mismos orígenes.
- **Timeout**: timeout estricto (5 segundos).
- **Sin credenciales**: no usar credenciales del sistema en requests externos.

---

## 30. File Upload Attacks

### 30.1 Protecciones

| Ataque | Mitigación |
|--------|------------|
| Executable uploads | Lista blanca de extensiones; validación de magic bytes |
| Polyglot files | Validación de magic bytes + análisis de contenido |
| MIME spoofing | Validación de magic bytes, no solo `Content-Type` |
| Path traversal | Object keys generados por backend; nunca usar nombre original |
| ZIP bombs | Límite de tamaño; límite de ratio de compresión |
| Oversized files | Límite de 50 MB por defecto |
| Malicious SVG | Sanitización o bloqueo de SVG |
| HTML uploads | Bloqueo o sanitización |

### 30.2 Validación en Upload

1. Validar MIME type declarado vs magic bytes.
2. Validar extensión contra lista blanca.
3. Validar tamaño.
4. Analizar contenido básico (file command equivalent).
5. En producción: escanear con antivirus.

### 30.3 Almacenamiento

- Archivos en S3/MinIO con ACL privado.
- Nunca en filesystem local del servidor de aplicación.
- Nunca ejecutar archivos subidos.

---

## 31. Security for Background Jobs

### 31.1 Principios

Los jobs no confían en datos enviados por usuarios sin validación.

### 31.2 Validación

Cada job debe volver a validar:

- Tenant context.
- Autorización del recurso.
- Existencia del recurso.
- Estado del recurso.

### 31.3 Aislamiento

- Un job nunca procesa datos de múltiples tenants en una misma ejecución.
- Si debe procesar múltiples tenants, se divide en ejecuciones por tenant.

### 31.4 Audit

Los jobs que realizan operaciones sensibles generan audit logs.

---

## 32. Security for Webhooks

### 32.1 Aplicabilidad

Si el sistema envía webhooks a sistemas externos.

### 32.2 Medidas

- Firma HMAC de payload.
- Timestamp en payload.
- Replay protection: rechazar requests con timestamp > 5 minutos.
- Idempotency: `idempotency_key` en payload.
- IP filtering si el destino lo requiere.
- Audit logging de envíos.

---

## 33. Security for External Integrations

### 33.1 Servicios Externos

| Servicio | Medida |
|----------|--------|
| S3/MinIO | IAM roles o access keys con least privilege |
| SMTP | Conexión TLS, autenticación, rate limiting |
| OAuth | PKCE, state parameter, token cifrado |
| Google Calendar | OAuth 2.0, scopes mínimos |

### 33.2 Credenciales

- Aisladas por entorno.
- Rotación periódica.
- Nunca en código fuente.
- Secrets manager en producción.

---

## 34. Data Privacy

### 34.1 Minimización

El sistema no recopila información que no necesite.

### 34.2 Clasificación

| Clasificación | Ejemplos | Tratamiento |
|---------------|----------|-------------|
| Pública | Nombre de empresa | Sin restricción |
| Interna | Documentos internos | Acceso por autenticación |
| Confidencial | Datos fiscales | Acceso por rol |
| Restringida | Passwords, MFA secrets | Cifrado, acceso mínimo |

### 34.3 Retención

- Audit logs: retención mínima 7 años.
- Documentos: retención según ciclo de vida.
- Backups: retención configurable.

### 34.4 Eliminación

- Soft delete para datos de usuario.
- Eliminación segura de backups.
- Derecho al olvido: procedimiento documentado.

### 34.5 Exportación

- Exportación de datos de usuario en formato estándar.
- Audit log de exportaciones.

### 34.6 Acceso

- Acceso a datos sensibles solo por rol autorizado.
- Acceso a audit logs solo por rol `audit_logs:read`.

---

## 35. Backups

### 35.1 Objetivos

- RPO < 1 hora.
- RTO < 2 horas.

### 35.2 PostgreSQL

- `pg_dump` diario cifrado.
- WAL archiving para PITR.
- Backups en almacenamiento separado.
- Verificación de integridad de backups.

### 35.3 Object Storage

- Versionado habilitado.
- Replicación en segunda región/proveedor.
- Política de retención.

### 35.4 Seguridad

- Backups cifrados con AES-256.
- Acceso a backups restringido.
- Separación de duties.

---

## 36. Disaster Recovery

### 36.1 Escenarios

| Escenario | RTO | RPO | Procedimiento |
|-----------|-----|-----|---------------|
| Database failure | 2 horas | 1 hora | Restore desde backup + PITR |
| Storage failure | 4 horas | 1 hora | Failover a región secundaria |
| Redis failure | 1 hora | 0 | Reiniciar Redis |
| Application failure | 1 hora | 0 | Reiniciar contenedores |
| Region failure | 4 horas | 1 hora | Failover a región secundaria |

### 36.2 Procedimiento de Restore

1. Detectar fallo.
2. Aislar componente fallido.
3. Restaurar desde backup más reciente.
4. Aplicar WAL hasta punto de fallo.
5. Validar integridad.
6. Reactivar servicios.
7. Notificar a stakeholders.

### 36.3 Incident Response

- Detección → Contención → Investigación → Erradicación → Recuperación → Post-Incident Review.

---

## 37. Deployment Security

### 37.1 Pipeline

- Secrets en secrets manager, nunca en pipeline.
- Dependency scanning en cada build.
- SAST en cada PR.
- Container scanning en cada build.
- Image signing en producción.
- Migration safety: revisión humana de migraciones.
- Production approvals: al menos 1 aprobación.
- Rollback automatizado si health check falla.

### 37.2 Ambientes

- Desarrollo: datos sintéticos.
- Staging: réplica de producción enmascarada.
- Producción: acceso restringido.

---

## 38. Dependency Security

### 38.1 Medidas

- `npm audit` en cada build.
- Dependabot o Renovate para actualizaciones automáticas.
- Lockfiles commitados.
- CVE monitoring.
- Dependency review en PRs.
- Actualización mensual de dependencias menores.
- Actualización trimestral de dependencias mayores.

### 38.2 Política

- No introducir dependencias innecesarias.
- Preferir dependencias mantenidas activamente.
- Evaluar seguridad antes de agregar dependencia.

---

## 39. Docker Security

### 39.1 Medidas

- Contenedores non-root.
- Imágenes minimales (`alpine`, `distroless`).
- Read-only filesystem cuando sea posible.
- Linux capabilities dropped.
- Secrets via environment variables o secrets manager.
- Network isolation.
- Image scanning.
- Resource limits.

### 39.2 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main"]
```

---

## 40. Production Hardening

### 40.1 PostgreSQL

- `ssl = on`.
- `password_encryption = scram-sha-256`.
- `row_security = on`.
- `fsync = on`.
- `wal_level = replica`.
- `timezone = UTC`.

### 40.2 Redis

- `requirepass`.
- `rename-command FLUSHDB ""`.
- `maxmemory` según capacidad.
- TLS en producción.
- ACL por aplicación.

### 40.3 API

- Helmet habilitado.
- CORS estricto.
- Rate limiting.
- Request validation estricto.
- No stack traces.

### 40.4 Frontend

- CSP estricta.
- Sin `eval()`.
- Cookies con `Secure`, `HttpOnly`, `SameSite`.

### 40.5 Nginx

- `server_tokens off`.
- `client_max_body_size 50M`.
- TLS 1.2+ only.
- HSTS.

### 40.6 S3/MinIO

- Bucket privado.
- Versionado habilitado.
- Server-side encryption.
- Bloqueo de acceso público.

---

## 41. Incident Response

### 41.1 Procedimiento

1. **Detection**: monitoreo, alertas, reportes.
2. **Containment**: aislar componente afectado.
3. **Investigation**: logs, audit trail, forensic.
4. **Eradication**: eliminar causa raíz.
5. **Recovery**: restaurar servicio.
6. **Post-Incident Review**: documentar, mejorar.

### 41.2 Severidades

| Nivel | Definición | Ejemplo | Tiempo Respuesta |
|-------|------------|---------|-----------------|
| P0 | Crítico | Brecha de seguridad, pérdida de datos | 15 minutos |
| P1 | Alto | Servicio caído, acceso no autorizado confirmado | 1 hora |
| P2 | Medio | Degradación, intento de ataque | 4 horas |
| P3 | Bajo | Bug menor, mejora de seguridad | 1 semana |

### 41.3 Roles

- Incident Commander.
- Technical Lead.
- Communications Lead.
- Legal/Compliance (si aplica).

---

## 42. Security Testing

### 42.1 Pruebas Mínimas

| Prueba | Herramienta | Frecuencia |
|--------|-------------|------------|
| Authentication | Jest, Supertest | Cada build |
| Authorization | Jest, Supertest | Cada build |
| Tenant isolation | Jest, Supertest | Cada build |
| RLS | Testcontainers + PostgreSQL | Cada migración |
| IDOR | Jest, Supertest | Cada build |
| XSS | Jest, DOMPurify tests | Cada build |
| SSRF | Jest, mocks | Cada build |
| Upload security | Jest, mocks | Cada build |
| Rate limiting | Jest, Redis mocks | Cada build |
| Token replay | Jest | Cada build |
| MFA | Jest | Cada build |
| Privilege escalation | Jest | Cada build |
| Audit integrity | Jest | Cada build |

### 42.2 E2E

- Playwright: flujos críticos (login, MFA, documentos, aprobación).
- Incluir intentos de acceso cross-tenant.

---

## 43. Threat Model

### 43.1 STRIDE

| Amenaza | Mitigación |
|---------|------------|
| **Spoofing** | JWT firmado, Argon2id, MFA, rate limiting |
| **Tampering** | Hash chain, RLS, firmas electrónicas, TLS |
| **Repudiation** | Audit log inmutable, hash chain |
| **Information Disclosure** | RLS, TLS, encryption at rest, secrets manager, redaction en logs |
| **Denial of Service** | Rate limiting, Redis cache, connection pooling, resource limits |
| **Elevation of Privilege** | RBAC, permission validation, tenant isolation |

---

## 44. Security Checklist

### 44.1 Authentication

- [ ] Login implementado
- [ ] Logout implementado
- [ ] Access tokens (15 min)
- [ ] Refresh tokens (7 días)
- [ ] Refresh token rotation
- [ ] Revocación de tokens
- [ ] Sesiones múltiples
- [ ] Cierre remoto de sesiones
- [ ] Recuperación de contraseña
- [ ] Bloqueo de cuenta
- [ ] Rate limiting login

### 44.2 Authorization

- [ ] RBAC implementado
- [ ] Permisos granulares
- [ ] Validación de permisos en backend
- [ ] Validación de estado de recursos
- [ ] Decoradores de autorización

### 44.3 Multi-tenancy

- [ ] Tenant context desde JWT
- [ ] Prisma middleware con tenant filter
- [ ] PostgreSQL RLS habilitado
- [ ] SET LOCAL por conexión
- [ ] Background jobs con tenant context
- [ ] WebSockets con tenant context
- [ ] Sin organization_id desde frontend

### 44.4 RLS

- [ ] RLS en tablas tenant-scoped
- [ ] Políticas SELECT/INSERT/UPDATE/DELETE
- [ ] Tablas inmutables protegidas
- [ ] Tablas globales sin RLS
- [ ] Connection pooling con SET LOCAL
- [ ] Validación de RLS en tests

### 44.5 MFA

- [ ] TOTP enrollment
- [ ] QR generation
- [ ] Validación TOTP
- [ ] Recovery codes (hashed)
- [ ] Regeneración de recovery codes
- [ ] Revocación MFA
- [ ] Auditoría de eventos MFA

### 44.6 Passwords

- [ ] Argon2id implementado
- [ ] Política de passwords
- [ ] Password history
- [ ] Protección contra compromised passwords
- [ ] Rate limiting login

### 44.7 Sessions

- [ ] Refresh token rotation
- [ ] Detección de reuse
- [ ] Device tracking
- [ ] Logout all sessions
- [ ] Sesiones sospechosas

### 44.8 API

- [ ] HTTPS
- [ ] CORS estricto
- [ ] Security headers
- [ ] Request validation
- [ ] Rate limiting
- [ ] API versioning
- [ ] Paginación
- [ ] Error handling seguro

### 44.9 Files

- [ ] Bucket privado
- [ ] Signed URLs
- [ ] MIME validation
- [ ] Magic bytes
- [ ] Object keys generados por backend
- [ ] Tamaño máximo
- [ ] Antivirus
- [ ] Audit logging

### 44.10 Documents

- [ ] Versionado inmutable
- [ ] Soft delete
- [ ] Firma electrónica
- [ ] Protección contra modificación histórica
- [ ] Acceso cross-tenant bloqueado

### 44.11 Audit

- [ ] Append-only
- [ ] Inmutable
- [ ] Hash chain
- [ ] Tenant scoped
- [ ] Eventos mínimos cubiertos
- [ ] Correlation ID

### 44.12 Secrets

- [ ] Secrets manager en producción
- [ ] Rotación de credenciales
- [ ] Sin secretos en Git
- [ ] Separación por entorno

### 44.13 Database

- [ ] Roles PostgreSQL segregados
- [ ] Least privilege
- [ ] TLS
- [ ] Encryption at rest
- [ ] Backups cifrados

### 44.14 Redis

- [ ] Autenticación
- [ ] TLS
- [ ] ACL
- [ ] Network isolation
- [ ] Key naming

### 44.15 Docker

- [ ] Non-root
- [ ] Imágenes mínimas
- [ ] Read-only filesystem
- [ ] Resource limits
- [ ] Image scanning

### 44.16 CI/CD

- [ ] Dependency scanning
- [ ] SAST
- [ ] Container scanning
- [ ] Image signing
- [ ] Migration review
- [ ] Production approvals

### 44.17 Backups

- [ ] Backup diario
- [ ] Cifrado
- [ ] Retención configurable
- [ ] Restore testeado

### 44.18 Monitoring

- [ ] Health checks
- [ ] Readiness probes
- [ ] Liveness probes
- [ ] Métricas básicas
- [ ] Alertas de seguridad

### 44.19 Incident Response

- [ ] Procedimiento documentado
- [ ] Roles definidos
- [ ] Canales de comunicación
- [ ] Post-incident review

---

## 45. Definition of Done

La seguridad se considera lista para producción cuando:

- [ ] **Tenant isolation verified**: pruebas automatizadas + revisión manual de RLS.
- [ ] **RLS verified**: todas las tablas tenant-scoped tienen RLS habilitado y políticas correctas.
- [ ] **RBAC verified**: todos los endpoints tienen validación de permisos.
- [ ] **MFA verified**: enrollment, validación, recovery codes funcionan correctamente.
- [ ] **Token rotation verified**: refresh token rotation funciona y detecta reuse.
- [ ] **Audit chain verified**: hash chain valida para todos los eventos.
- [ ] **File security verified**: upload/download con signed URLs, validación MIME, antivirus.
- [ ] **Secrets secured**: secrets manager configurado, rotación documentada.
- [ ] **Backups tested**: restore exitoso en entorno de prueba.
- [ ] **Security tests passed**: suite completa de seguridad pasa en CI.
- [ ] **Dependency vulnerabilities reviewed**: sin vulnerabilidades críticas/altas sin mitigación.
- [ ] **Production hardening completed**: checklist de producción completada.
- [ ] **Incident response ready**: procedimiento documentado y equipo notificado.
- [ ] **Security review passed**: revisión por equipo de seguridad.

---

## 46. Reglas Importantes

1. No inventes funcionalidades que contradigan ARCHITECTURE.md.
2. No contradigas DATABASE.md.
3. Si existe conflicto, documenta el conflicto en lugar de ocultarlo.
4. No escribas código de aplicación.
5. Puedes utilizar pseudocódigo y SQL conceptual únicamente para explicar decisiones.
6. No agregues complejidad innecesaria.
7. Diseña para producción, no únicamente para desarrollo.
8. Prioriza seguridad por defecto.
9. Aplica least privilege.
10. Asume que el frontend es completamente no confiable.
11. Asume que cualquier usuario puede intentar acceder a recursos de otro tenant.
12. Toda operación crítica debe ser auditable.
13. No confíes únicamente en controles de aplicación cuando PostgreSQL pueda proporcionar una segunda barrera.
14. Toda decisión importante debe explicar el POR QUÉ.
15. El documento debe ser suficientemente detallado para que otro desarrollador pueda implementar el sistema sin tener que reinterpretar la arquitectura.
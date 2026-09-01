# API Specification - QMS Platform

## 1. API Contract Conflicts

No se detectaron contradicciones entre `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md` y `prisma/schema.prisma` que impidan definir la especificación de API en esta fase.

Si en fases futuras se detectan discrepancias entre el comportamiento API definido aquí y los documentos fuente, se documentarán en la sección `API_CONTRACT_CONFLICT` con:
- archivo afectado;
- sección;
- descripción del conflicto;
- impacto;
- recomendación.

---

## 2. General Conventions

### 2.1 Base URL
```
/api/v1
```
Todas las rutas se versionan bajo `/api/v1`. Cambios incompatibles futuros utilizarán `/api/v2`.

### 2.2 Content Types
- `application/json` para requests y responses estándar.
- `multipart/form-data` exclusivamente para endpoints de upload de archivos.

### 2.3 Authentication
- Mecanismo principal: Bearer JWT (`Authorization: Bearer <access_token>`).
- Access token lifetime: 15 minutos.
- Refresh token lifetime: 7 días, con rotación y revocación.
- Los tokens se almacenan en la tabla `refresh_tokens` con hash y posibilidad de revocación.
- Nunca se devuelven secretos, hashes de password, tokens en texto plano ni datos sensibles innecesarios en respuestas.

### 2.4 Tenant Resolution
El `organizationId` (tenant) se determina exclusivamente desde el contexto de autenticación/autorización, **nunca** desde un parámetro de query, body o header confiable del cliente sin validación.

Estrategia:
1. **Primaria**: claim `tenant_id` dentro del JWT de acceso, poblado durante el login a partir del `organizationId` del usuario autenticado.
2. **Validación**: cualquier `organizationId` enviado por el cliente en query/body debe coincidir con el `tenant_id` del JWT; si no coincide, se ignora y se usa el del contexto, o se rechaza con `403 Forbidden` si existe riesgo de confusión.
3. **Contexto RLS**: el backend ejecuta `SET LOCAL app.current_organization_id = '<tenant_id>'` al inicio de cada request transaccional para activar RLS en PostgreSQL.

> Regla: el tenant se resuelve backend-side; el frontend no lo determina.

### 2.5 Request / Response Envelope
Todas las respuestas exitosas usan envoltorio JSON.

**Éxito individual:**
```json
{
  "data": {}
}
```

**Colección:**
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

### 2.6 Error Format
Formato RFC 7807 adaptado o equivalente:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": [],
    "correlationId": "uuid"
  }
}
```

Reglas:
- No se exponen stack traces, SQL, secretos, rutas internas ni información de sistema.
- `correlationId` se genera server-side si el cliente no envía `X-Correlation-ID`.

### 2.7 HTTP Status Codes
Uso estándar:
- `200 OK`: Lectura o actualización exitosa.
- `201 Created`: Recurso creado exitosamente.
- `202 Accepted`: Operación aceptada para procesamiento asíncrono.
- `204 No Content`: Operación exitosa sin cuerpo de respuesta (ej: logout, delete lógico).
- `400 Bad Request`: Validación fallida o request mal formado.
- `401 Unauthorized`: Token ausente, inválido o expirado.
- `403 Forbidden`: Permisos insuficientes o tenant no autorizado.
- `404 Not Found`: Recurso no encontrado.
- `409 Conflict`: Conflicto de estado o versión (optimistic locking).
- `422 Unprocessable Entity`: Regla de negocio violada (ej: transición de estado inválida).
- `429 Too Many Requests`: Rate limit excedido.
- `500 Internal Server Error`: Error inesperado no categorizado.
- `503 Service Unavailable`: Mantenimiento o dependencia externa no disponible.

### 2.8 Pagination
Estrategia: offset pagination.

Parámetros:
- `page`: número de página (default `1`, mínimo `1`).
- `pageSize`: tamaño de página (default `25`, mínimo `1`, máximo `100`).

Response metadata:
```json
{
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

> Nota: si en el futuro se requiere cursor pagination para colecciones muy grandes o streaming, se documentará por endpoint.

### 2.9 Filtering
Convención: query parameters declarados por endpoint (allowlist). No se permite filtrado dinámico arbitrario sobre columnas no expuestas.

Ejemplos:
- `?status=ACTIVE`
- `?createdFrom=2024-01-01`
- `?createdTo=2024-01-31`
- `?search=termino` (búsqueda full-text limitada a campos permitidos)
- `?documentTypeId=uuid`

### 2.10 Sorting
Parámetros:
- `sortBy`: campo permitido (allowlist específica por recurso).
- `sortOrder`: `asc` | `desc` (default `desc` en createdAt).

Ejemplo:
```
GET /api/v1/documents?sortBy=createdAt&sortOrder=desc
```

Regla: nunca se interpola directamente una columna enviada por el cliente; siempre se valida contra la allowlist.

### 2.11 Idempotency
Operaciones críticas soportan `Idempotency-Key` header:
- Creación de documentos/versiones.
- Uploads de archivos.
- Aprobaciones / rechazos.
- Publicaciones.
- Firmas electrónicas.
- Transiciones de workflow críticas.

Backend almacena resultado por clave por 24 horas.

Header:
```
Idempotency-Key: <uuid>
```

### 2.12 Concurrency
Protección contra actualizaciones simultáneas mediante optimistic locking.

Mecanismos:
- Campo `version` (integer) cuando el modelo lo exponga.
- Alternativa: validación de `updatedAt` contra el valor conocido por el cliente.

Aplica especialmente a:
- Documents
- DocumentVersions
- Approvals
- Nonconformities
- CorrectiveActions
- Risks

Respuesta en conflicto:
- `409 Conflict` con mensaje de versión obsoleta.

### 2.13 Rate Limiting
Categorías configurables:
- `AUTH`: login, logout, refresh, password reset.
- `MFA`: enrollment, verification, recovery codes.
- `PASSWORD_RESET`: solicitud y consumo de tokens.
- `API`: requests generales por usuario/tenant.
- `UPLOAD`: solicitudes de presigned URL o upload directo.
- `EXPENSIVE_QUERY`: búsquedas con full-text o agregaciones pesadas.

Implementación backend con Redis cuando se requiera distribución.

Headers de respuesta (cuando aplique):
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1698765432
```

### 2.14 Health Endpoints
- `GET /health` - Estado general del servicio.
- `GET /health/live` - Liveness probe (proceso vivo).
- `GET /health/ready` - Readiness probe (dependencias listas: DB, storage, cache).

No exponen información sensible.

### 2.15 Observability
- Header `X-Correlation-ID`: cliente puede enviarlo; si no, el backend lo genera.
- Cada request lo incluye en respuesta y logs.
- El `correlationId` se propaga en errores y en registros de auditoría cuando aplique.

---

## 3. Authentication

### 3.1 Transporte de Refresh Token

El refresh token **NO** se devuelve en el response body JSON.

Se transmite exclusivamente mediante:

```
Set-Cookie: refreshToken=<opaque-random-token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

El response JSON de `POST /auth/login` y `POST /auth/refresh` **NO** contiene `refreshToken`.

El navegador envía automáticamente la cookie en las operaciones correspondientes.

### 3.2 POST /auth/login
Autentica usuario y devuelve access token. El refresh token se entrega vía cookie HttpOnly.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "string",
  "mfaCode": "123456" // opcional si MFA está activo
}
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "string",
    "expiresIn": 900,
    "tokenType": "Bearer",
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

**Cookies:**
- `refreshToken`: HttpOnly, Secure, SameSite=Strict, Path=/api/v1/auth, Max-Age=604800

**Errores:**
- `401 InvalidCredentials`: email/password inválidos.
- `401 MfaRequired`: MFA activo y código no proporcionado o inválido.
- `403 AccountLocked`: cuenta bloqueada.
- `403 AccountInactive`: cuenta inactiva.
- `429 TooManyRequests`: rate limit excedido.

**Audit:** sí (login exitoso y fallido).

---

### 3.3 POST /auth/logout
Revoca el refresh token actual (extraído de cookie HttpOnly).

**Auth:** required

**Request:** Sin body. El refresh token se extrae de la cookie `refreshToken`.

**Response:** `204 No Content`

**Cookies:**
- `refreshToken`: se establece con expiración pasada para limpiar la cookie.

**Audit:** sí.

---

### 3.4 POST /auth/refresh
Rota el access token usando el refresh token válido extraído de cookie HttpOnly.

**Auth:** public (el refresh token en cookie actúa como credencial)

**Request:** Sin body. El refresh token se extrae de la cookie `refreshToken`.

**Response 200:**
```json
{
  "data": {
    "accessToken": "string",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

**Cookies:**
- `refreshToken`: nuevo valor HttpOnly, Secure, SameSite=Strict tras rotación exitosa.

**Errores:**
- `401 InvalidToken`
- `401 TokenRevoked`
- `401 TokenExpired`
- `401 RefreshTokenReuse`: se detectó reutilización de refresh token rotado.

**Audit:** sí.

---

### 3.5 POST /auth/forgot-password
Inicia el flujo de recuperación de contraseña.

**Auth:** public

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `202 Accepted`

**Errores:**
- `429 TooManyRequests`

**Audit:** sí.

---

### 3.6 POST /auth/reset-password
Consume el token de recuperación y establece nueva contraseña.

**Auth:** public

**Request:**
```json
{
  "token": "string",
  "password": "string"
}
```

**Response:** `202 Accepted`

**Errores:**
- `400 InvalidToken`
- `422 WeakPassword`

**Audit:** sí.

---

### 3.7 POST /auth/change-password
Cambia contraseña del usuario autenticado.

**Auth:** required

**Request:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response:** `204 No Content`

**Errores:**
- `401 InvalidCredentials`
- `422 WeakPassword`

**Audit:** sí.

---

### 3.8 GET /auth/me
Obtiene el perfil del usuario autenticado con tenant y roles efectivos.

**Auth:** required

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "string",
    "lastName": "string",
    "departmentId": "uuid",
    "department": {
      "id": "uuid",
      "name": "string"
    },
    "mfaEnabled": true,
    "lastLoginAt": "2024-01-01T00:00:00Z",
    "tenant": {
      "organizationId": "uuid",
      "name": "string"
    },
    "roles": [
      {
        "id": "uuid",
        "name": "string",
        "permissions": [
          {
            "resource": "documents",
            "action": "read"
          }
        ]
      }
    ]
  }
}
```

**Audit:** no (lectura propia).

---

## 4. MFA (Multi-Factor Authentication)

Todos los endpoints de esta sección requieren autenticación previa.

### 4.1 POST /auth/mfa/enroll
Genera secreto TOTP y URL de configuración (QR).

**Auth:** required  
**Permission:** `mfa:manage`

**Response 201:**
```json
{
  "data": {
    "secret": "string",
    "qrCodeUrl": "string",
    "backupCodes": ["string"]
  }
}
```

> Nota: el secreto se devuelve una sola vez para su configuración inicial.

---

### 4.2 POST /auth/mfa/verify
Verifica y activa MFA después del enroll.

**Auth:** required  
**Permission:** `mfa:manage`

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** `204 No Content`

**Errores:**
- `400 InvalidCode`
- `409 AlreadyEnabled`

**Audit:** sí.

---

### 4.3 POST /auth/mfa/disable
Desactiva MFA del usuario autenticado.

**Auth:** required  
**Permission:** `mfa:manage`

**Request:**
```json
{
  "code": "123456"
}
```

**Response:** `204 No Content`

**Errores:**
- `400 InvalidCode`

**Audit:** sí.

---

### 4.4 POST /auth/mfa/recovery-codes/regenerate
Regenera códigos de recuperación.

**Auth:** required  
**Permission:** `mfa:manage`

**Response 201:**
```json
{
  "data": {
    "recoveryCodes": ["string"]
  }
}
```

> Nota: invalida los códigos anteriores.

**Audit:** sí.

---

### 4.5 GET /auth/mfa/status
Consulta estado de MFA.

**Auth:** required  
**Permission:** `mfa:read`

**Response 200:**
```json
{
  "data": {
    "enabled": true,
    "enrolledAt": "2024-01-01T00:00:00Z",
    "lastUsedAt": "2024-01-02T00:00:00Z"
  }
}
```

---

## 5. Users

**Convenciones generales:**
- Tenant scope: todas las operaciones están limitadas al tenant del usuario autenticado.
- No se permite DELETE físico; se usa desactivación lógica (`isActive = false`, `deletedAt`).
- Las contraseñas nunca se devuelven en responses.
- Asignación de roles respeta RBAC.

### 5.1 GET /users
Lista usuarios del tenant.

**Auth:** required  
**Permission:** `users:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`: number (default 1)
- `pageSize`: number (default 25, max 100)
- `search`: string (busca en nombre, apellido, email)
- `roleId`: uuid
- `departmentId`: uuid
- `isActive`: boolean

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "departmentId": "uuid",
      "department": {
        "id": "uuid",
        "name": "string"
      },
      "isActive": true,
      "mfaEnabled": false,
      "lastLoginAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 5.2 POST /users
Crea un usuario en el tenant.

**Auth:** required  
**Permission:** `users:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "email": "user@example.com",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "departmentId": "uuid?",
  "roleIds": ["uuid"],
  "mfaEnabled": false
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "string",
    "lastName": "string",
    "departmentId": "uuid?",
    "isActive": true,
    "mfaEnabled": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Errores:**
- `409 DuplicateEmail`
- `422 WeakPassword`
- `422 InvalidRoleIds`

---

### 5.3 GET /users/:id
Consulta detalle de usuario.

**Auth:** required  
**Permission:** `users:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "departmentId": "uuid",
    "department": { "id": "uuid", "name": "string" },
    "isActive": true,
    "mfaEnabled": false,
    "lastLoginAt": "2024-01-01T00:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "roles": [
      {
        "id": "uuid",
        "name": "string",
        "permissions": [
          { "resource": "string", "action": "string" }
        ]
      }
    ]
  }
}
```

---

### 5.4 PATCH /users/:id
Actualiza datos de usuario (no password ni roles por esta vía).

**Auth:** required  
**Permission:** `users:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "firstName": "string?",
  "lastName": "string?",
  "departmentId": "uuid?",
  "isActive": true
}
```

**Response 200:** objeto usuario actualizado.

**Errores:**
- `404 UserNotFound`
- `409 DuplicateEmail` (si cambia email y ya existe en tenant)
- `409 ConcurrentUpdate` (optimistic locking)

---

### 5.5 POST /users/:id/activate
Reactiva usuario desactivado.

**Auth:** required  
**Permission:** `users:activate`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

### 5.6 POST /users/:id/deactivate
Desactiva usuario (soft delete).

**Auth:** required  
**Permission:** `users:deactivate`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

**Regla:** no se permite desactivar el último usuario activo con permiso `users:manage` del tenant.

---

### 5.7 POST /users/:id/roles
Asigna roles a un usuario.

**Auth:** required  
**Permission:** `users:assignRoles`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "roleIds": ["uuid"]
}
```

**Response 201:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "roleId": "uuid",
      "assignedBy": "uuid",
      "assignedAt": "2024-01-01T00:00:00Z",
      "expiresAt": null
    }
  ]
}
```

**Errores:**
- `404 UserNotFound`
- `404 RoleNotFound`
- `409 RoleAlreadyAssigned`

---

### 5.8 GET /users/:id/permissions
Obtiene permisos efectivos del usuario (unión de roles activos).

**Auth:** required  
**Permission:** `users:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "resource": "documents",
      "action": "read",
      "description": "Leer documentos"
    }
  ]
}
```

---

## 6. Roles & Permissions

### 6.1 GET /roles
Lista roles del tenant.

**Auth:** required  
**Permission:** `roles:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`, `search`, `isActive`

**Response 200:** colección con `data[]` y `meta`.

---

### 6.2 POST /roles
Crea rol en el tenant.

**Auth:** required  
**Permission:** `roles:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "Quality Manager",
  "description": "string",
  "isSystem": false,
  "permissionIds": ["uuid"]
}
```

**Response 201:** rol creado.

**Errores:**
- `409 DuplicateRoleName`

---

### 6.3 GET /roles/:id
Obtiene detalle de rol con permisos.

**Auth:** required  
**Permission:** `roles:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 6.4 PATCH /roles/:id
Actualiza nombre o descripción de rol.

**Auth:** required  
**Permission:** `roles:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "description": "string?",
  "isActive": true
}
```

**Restricción:** roles `isSystem=true` no pueden renombrarse ni desactivarse vía API.

---

### 6.5 POST /roles/:id/deactivate
Desactiva rol (soft delete).

**Auth:** required  
**Permission:** `roles:deactivate`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

### 6.6 GET /roles/:id/permissions
Lista permisos asignados al rol.

**Auth:** required  
**Permission:** `roles:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 6.7 POST /roles/:id/permissions
Agrega permisos a un rol.

**Auth:** required  
**Permission:** `roles:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "permissionIds": ["uuid"]
}
```

**Response 201/204**

**Errores:**
- `404 PermissionNotFound`
- `409 PermissionAlreadyAssigned`

---

### 6.8 DELETE /roles/:id/permissions/:permissionId
Remueve un permiso de un rol.

**Auth:** required  
**Permission:** `roles:update`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

### 6.9 GET /permissions
Lista catálogo global de permisos.

**Auth:** required  
**Permission:** `permissions:read`  
**Tenant scope:** no (global)  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "resource": "documents",
      "action": "read",
      "description": "Leer documentos"
    }
  ]
}
```

---

## 7. Organizations

Todas las operaciones afectan exclusivamente al tenant autenticado.

### 7.1 GET /organization
Obtiene la configuración de la organización del tenant.

**Auth:** required  
**Permission:** `organization:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "string",
    "taxId": "string?",
    "email": "string?",
    "phone": "string?",
    "address": "string?",
    "timezone": "UTC",
    "locale": "es",
    "logoUrl": "string?",
    "primaryColor": "#000000?",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 7.2 PATCH /organization
Actualiza datos de la organización.

**Auth:** required  
**Permission:** `organization:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "taxId": "string?",
  "email": "string?",
  "phone": "string?",
  "address": "string?",
  "timezone": "string?",
  "locale": "string?",
  "logoUrl": "string?",
  "primaryColor": "string?"
}
```

**Response 200:** organización actualizada.

**Errores:**
- `409 ConcurrentUpdate`

---

### 7.3 GET /organization/settings
Obtiene configuración clave/valor del tenant.

**Auth:** required  
**Permission:** `organization:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "key": "qms_config",
      "value": {},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 7.4 PATCH /organization/settings
Actualiza configuración.

**Auth:** required  
**Permission:** `organization:updateSettings`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "qms_config": { "allowPublicRegistration": false }
}
```

> Nota: se acepta un objeto parcial; las claves existentes no enviadas se conservan.

**Response 200:** settings actualizadas.

---

### 7.5 GET /organization/standards
Lista estándares adoptados por la organización.

**Auth:** required  
**Permission:** `organization:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "organizationId": "uuid",
      "standardId": "uuid",
      "standard": {
        "id": "uuid",
        "code": "ISO-9001",
        "name": "string",
        "version": "string"
      },
      "adoptedAt": "2024-01-01",
      "isActive": true,
      "configuration": {}
    }
  ]
}
```

---

## 8. Departments

### 8.1 GET /departments
Lista departamentos del tenant.

**Auth:** required  
**Permission:** `departments:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre
- `parentId`: uuid (filtra hijos directos; omitir para raíz)
- `isActive`: boolean

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string?",
      "parentDepartmentId": "uuid?",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 8.2 POST /departments
Crea un departamento.

**Auth:** required  
**Permission:** `departments:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string",
  "description": "string?",
  "parentDepartmentId": "uuid?"
}
```

**Response 201:** departamento creado.

**Errores:**
- `409 DuplicateDepartmentName`

---

### 8.3 GET /departments/:id
Obtiene detalle de departamento.

**Auth:** required  
**Permission:** `departments:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 8.4 PATCH /departments/:id
Actualiza departamento.

**Auth:** required  
**Permission:** `departments:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "description": "string?",
  "parentDepartmentId": "uuid?",
  "isActive": true
}
```

**Response 200:** departamento actualizado.

---

### 8.5 POST /departments/:id/deactivate
Desactiva departamento.

**Auth:** required  
**Permission:** `departments:deactivate`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

## 9. Areas

### 9.1 GET /areas
Lista áreas del tenant.

**Auth:** required  
**Permission:** `areas:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre o código
- `parentId`: uuid
- `isActive`: boolean

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "code": "string?",
      "description": "string?",
      "parentAreaId": "uuid?",
      "managerId": "uuid?",
      "manager": {
        "id": "uuid",
        "firstName": "string",
        "lastName": "string"
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 9.2 POST /areas
Crea un área.

**Auth:** required  
**Permission:** `areas:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string",
  "code": "string?",
  "description": "string?",
  "parentAreaId": "uuid?",
  "managerId": "uuid?"
}
```

**Response 201:** área creada.

**Errores:**
- `409 DuplicateAreaName`

---

### 9.3 GET /areas/:id
Obtiene detalle de área.

**Auth:** required  
**Permission:** `areas:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 9.4 PATCH /areas/:id
Actualiza área.

**Auth:** required  
**Permission:** `areas:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "code": "string?",
  "description": "string?",
  "parentAreaId": "uuid?",
  "managerId": "uuid?",
  "isActive": true
}
```

**Response 200:** área actualizada.

---

### 9.5 POST /areas/:id/deactivate
Desactiva área.

**Auth:** required  
**Permission:** `areas:deactivate`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Módulos QMS Core]

---

## 10. File Assets

### 10.1 POST /file-assets/upload-url
Solicita URL presignada para upload directo a S3/MinIO.

**Auth:** required  
**Permission:** `files:upload`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "filename": "procedure_v2.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 1048576,
  "sha256Hash": "string",
  "folder": "documents/versions"
}
```

**Response 201:**
```json
{
  "data": {
    "uploadId": "uuid",
    "storageProvider": "S3",
    "bucketName": "qms-uploads",
    "objectKey": "tenants/{organization_id}/documents/{document_id}/{version_id}_{file_uuid}.pdf",
    "presignedUploadUrl": "https://s3.amazonaws.com/...",
    "presignedDownloadUrl": null,
    "expiresIn": 3600,
    "maxFileSizeBytes": 10485760,
    "allowedMimeTypes": ["application/pdf", "image/png"]
  }
}
```

**Reglas:**
- El backend valida tamaño y tipo de archivo.
- El backend genera `objectKey` único dentro del tenant.
- El cliente sube el archivo directamente al storage; el backend no actúa como proxy.
- El `uploadId` se usa luego en `POST /file-assets/confirm`.

**Errores:**
- `413 PayloadTooLarge`
- `415 UnsupportedMediaType`

---

### 10.2 POST /file-assets/confirm
Confirma un upload y crea el registro `FileAsset`.

**Auth:** required  
**Permission:** `files:upload`  
**Tenant scope:** sí  
**Audit:** sí  
**Headers:** `Idempotency-Key`

**Request:**
```json
{
  "uploadId": "uuid",
  "storageProvider": "S3",
  "bucketName": "qms-uploads",
  "objectKey": "tenants/.../file.pdf",
  "originalFilename": "procedure_v2.pdf",
  "mimeType": "application/pdf",
  "fileSizeBytes": 1048576,
  "sha256Hash": "string",
  "metadata": { "pageCount": 5, "author": "string" }
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "organizationId": "uuid",
    "storageProvider": "S3",
    "bucketName": "qms-uploads",
    "objectKey": "tenants/.../file.pdf",
    "originalFilename": "procedure_v2.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 1048576,
    "sha256Hash": "string",
    "metadata": { "pageCount": 5 },
    "uploadedById": "uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Validaciones:**
- El backend verifica que el archivo existe en storage (HEAD request o similar).
- El backend valida que el `sha256Hash` coincide.
- El backend verifica que el `uploadId` no fue confirmado previamente (idempotencia).

---

### 10.3 GET /file-assets/:id/download-url
Obtiene URL presignada para descargar un archivo.

**Auth:** required  
**Permission:** depende del recurso asociado (ej: `documents:read`)  
**Tenant scope:** sí  
**Audit:** sí

**Response 200:**
```json
{
  "data": {
    "fileAssetId": "uuid",
    "originalFilename": "procedure_v2.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 1048576,
    "presignedDownloadUrl": "https://s3.amazonaws.com/...",
    "expiresIn": 3600
  }
}
```

**Reglas:**
- Solo se genera URL si el usuario tiene permiso sobre el recurso asociado.
- La URL expira en 1 hora.
- Se registra en audit log.

---

### 10.4 GET /file-assets
Lista archivos del tenant.

**Auth:** required  
**Permission:** `files:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre original
- `mimeType`: filtro por tipo
- `uploadedById`: uuid
- `createdFrom`, `createdTo`: fechas

**Response 200:** colección con metadatos; no se exponen URLs firmadas.

---

## 11. Process Management

### 11.1 GET /processes
Lista procesos del tenant.

**Auth:** required  
**Permission:** `processes:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre o código
- `areaId`: uuid
- `parentId`: uuid (omitir para raíz)
- `isActive`: boolean

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "string",
      "name": "string",
      "description": "string?",
      "areaId": "uuid?",
      "area": { "id": "uuid", "name": "string" },
      "parentProcessId": "uuid?",
      "ownerId": "uuid?",
      "owner": { "id": "uuid", "firstName": "string", "lastName": "string" },
      "processType": "string?",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 11.2 POST /processes
Crea un proceso.

**Auth:** required  
**Permission:** `processes:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "code": "string",
  "name": "string",
  "description": "string?",
  "areaId": "uuid?",
  "parentProcessId": "uuid?",
  "ownerId": "uuid?",
  "processType": "string?"
}
```

**Response 201:** proceso creado.

**Errores:**
- `409 DuplicateProcessCode`

---

### 11.3 GET /processes/:id
Obtiene detalle de proceso.

**Auth:** required  
**Permission:** `processes:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 11.4 PATCH /processes/:id
Actualiza proceso.

**Auth:** required  
**Permission:** `processes:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "description": "string?",
  "areaId": "uuid?",
  "parentProcessId": "uuid?",
  "ownerId": "uuid?",
  "processType": "string?",
  "isActive": true
}
```

**Response 200:** proceso actualizado.

---

### 11.5 POST /processes/:id/deactivate
Desactiva proceso.

**Auth:** required  
**Permission:** `processes:deactivate`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

## 12. ISO Standards

### 12.1 GET /standards
Lista catálogo global de estándares.

**Auth:** required  
**Permission:** `standards:read`  
**Tenant scope:** no (global)  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: código o nombre
- `isActive`: boolean

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "ISO-9001",
      "name": "string",
      "description": "string?",
      "version": "string?",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 12.2 GET /standards/:id
Obtiene detalle de estándar con sus requisitos.

**Auth:** required  
**Permission:** `standards:read`  
**Tenant scope:** no (global)  
**Audit:** no

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "code": "ISO-9001",
    "name": "string",
    "description": "string?",
    "version": "string?",
    "isActive": true,
    "requirements": [
      {
        "id": "uuid",
        "code": "4.1",
        "title": "string",
        "description": "string?",
        "clause": "string?",
        "parentRequirementId": "uuid?",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 12.3 GET /standards/:id/requirements
Lista requisitos de un estándar.

**Auth:** required  
**Permission:** `standards:read`  
**Tenant scope:** no (global)  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `parentId`: uuid (filtra hijos directos)
- `search`: código o título

---

### 12.4 GET /organization/standards
Lista estándares adoptados por la organización (ya definido en 7.5).

---

### 12.5 POST /organization/standards
Adopta un estándar en el tenant.

**Auth:** required  
**Permission:** `organization:updateStandards`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "standardId": "uuid",
  "adoptedAt": "2024-01-01",
  "isActive": true,
  "configuration": {}
}
```

**Response 201:**
```json
{
  "data": {
    "organizationId": "uuid",
    "standardId": "uuid",
    "adoptedAt": "2024-01-01",
    "isActive": true,
    "configuration": {},
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Errores:**
- `409 StandardAlreadyAdopted`

---

### 12.6 PATCH /organization/standards/:standardId
Actualiza configuración de estándar adoptado.

**Auth:** required  
**Permission:** `organization:updateStandards`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "isActive": true,
  "configuration": {}
}
```

**Response 200:** configuración actualizada.

---

## 13. Document Management

### 13.1 GET /documents
Lista documentos del tenant.

**Auth:** required  
**Permission:** `documents:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: título, código
- `status`: enum DocumentStatus
- `documentTypeId`: uuid
- `processId`: uuid
- `ownerId`: uuid
- `departmentId`: uuid
- `classification`: enum
- `isActive`: boolean
- `sortBy`: `createdAt` | `updatedAt` | `code` | `title` | `nextReviewDate` (allowlist)
- `sortOrder`: `asc` | `desc`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "string",
      "title": "string",
      "description": "string?",
      "documentTypeId": "uuid",
      "documentType": { "id": "uuid", "name": "string" },
      "processId": "uuid?",
      "departmentId": "uuid?",
      "ownerId": "uuid",
      "owner": { "id": "uuid", "firstName": "string", "lastName": "string" },
      "responsibleId": "uuid",
      "responsible": { "id": "uuid", "firstName": "string", "lastName": "string" },
      "classification": "INTERNAL",
      "confidentiality": "CONFIDENTIAL",
      "status": "DRAFT",
      "currentVersionId": "uuid?",
      "currentVersion": {
        "id": "uuid",
        "versionMajor": 1,
        "versionMinor": 0,
        "versionLabel": "1.0",
        "status": "APPROVED",
        "createdAt": "2024-01-01T00:00:00Z"
      },
      "issueDate": "2024-01-01",
      "reviewDate": "2024-01-01",
      "nextReviewDate": "2024-01-01",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 13.2 POST /documents
Crea un documento.

**Auth:** required  
**Permission:** `documents:create`  
**Tenant scope:** sí  
**Audit:** sí  
**Headers:** `Idempotency-Key`

**Request:**
```json
{
  "code": "PROC-001",
  "title": "string",
  "description": "string?",
  "documentTypeId": "uuid",
  "processId": "uuid?",
  "departmentId": "uuid?",
  "ownerId": "uuid",
  "responsibleId": "uuid",
  "classification": "INTERNAL",
  "confidentiality": "CONFIDENTIAL",
  "issueDate": "2024-01-01",
  "reviewDate": "2024-01-01",
  "nextReviewDate": "2024-01-01"
}
```

**Response 201:** documento creado con `status=DRAFT`.

**Errores:**
- `409 DuplicateDocumentCode`

---

### 13.3 GET /documents/:id
Obtiene detalle de documento.

**Auth:** required  
**Permission:** `documents:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 13.4 PATCH /documents/:id
Actualiza metadatos del documento (no versiones ni workflow).

**Auth:** required  
**Permission:** `documents:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "title": "string?",
  "description": "string?",
  "processId": "uuid?",
  "departmentId": "uuid?",
  "ownerId": "uuid?",
  "responsibleId": "uuid?",
  "classification": "INTERNAL?",
  "confidentiality": "CONFIDENTIAL?",
  "nextReviewDate": "2024-01-01?",
  "isActive": true
}
```

**Response 200:** documento actualizado.

**Errores:**
- `404 DocumentNotFound`
- `409 ConcurrentUpdate`

---

### 13.5 POST /documents/:id/submit
Envía documento a revisión.

**Auth:** required  
**Permission:** `documents:submit`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "changeReason": "string"
}
```

**Response:** `204 No Content`

**Validaciones:**
- Status debe ser `DRAFT` o `REJECTED`.
- Debe existir al menos una versión.

**Errores:**
- `422 InvalidStatusTransition`

---

### 13.6 POST /documents/:id/submit-for-approval
Envía documento de revisión (IN_REVIEW) a aprobación (PENDING_APPROVAL).

**Auth:** required  
**Permission:** `documents:approve`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{}
```

**Response:** `204 No Content`

**Validaciones:**
- Status debe ser `IN_REVIEW`.
- Requiere `If-Match` para concurrencia.

**Errores:**
- `404 DocumentNotFound`
- `409 ConcurrentUpdate`
- `422 InvalidStatusTransition`

---

### 13.7 POST /documents/:id/approve
Aprueba un documento.

**Auth:** required  
**Permission:** `documents:approve`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "comment": "string?"
}
```

**Response:** `204 No Content`

**Validaciones:**
- Usuario debe ser aprobador designado.
- Status debe ser `PENDING_APPROVAL`.

---

### 13.8 POST /documents/:id/reject
Rechaza un documento.

**Auth:** required  
**Permission:** `documents:approve`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "comment": "string"
}
```

**Response:** `204 No Content`

---

### 13.9 POST /documents/:id/publish
Publica un documento aprobado.

**Auth:** required  
**Permission:** `documents:publish`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

**Validaciones:**
- Status debe ser `APPROVED`.

---

### 13.10 POST /documents/:id/obsolete
Marca documento como obsoleto.

**Auth:** required  
**Permission:** `documents:obsolete`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "reason": "string"
}
```

**Response:** `204 No Content`

---

### 13.11 POST /documents/:id/cancel
Cancela un documento.

**Auth:** required  
**Permission:** `documents:cancel`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "reason": "string"
}
```

**Response:** `204 No Content`

---

### 13.12 POST /documents/:id/versions
Crea una nueva versión del documento.

**Auth:** required  
**Permission:** `documents:createVersion`  
**Tenant scope:** sí  
**Audit:** sí  
**Headers:** `Idempotency-Key`

**Request:**
```json
{
  "fileAssetId": "uuid",
  "versionMajor": 1,
  "versionMinor": 0,
  "versionLabel": "1.0",
  "fileHash": "string",
  "changeReason": "string"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "documentId": "uuid",
    "organizationId": "uuid",
    "versionMajor": 1,
    "versionMinor": 0,
    "versionLabel": "1.0",
    "fileAssetId": "uuid",
    "fileHash": "string",
    "changeReason": "string",
    "status": "DRAFT",
    "createdById": "uuid",
    "approvedById": null,
    "approvedAt": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Validaciones:**
- `versionMajor >= 1`, `versionMinor >= 0`.
- `(documentId, versionMajor, versionMinor)` único.
- `fileHash` debe coincidir con el asset subido.

**Errores:**
- `409 DuplicateVersion`
- `422 InvalidVersionNumber`

---

### 13.13 GET /documents/:id/versions
Lista versiones de un documento.

**Auth:** required  
**Permission:** `documents:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `status`: enum
- `sortBy`: `createdAt` | `versionMajor` | `versionMinor`

---

### 13.14 GET /documents/versions/:versionId
Obtiene una versión específica.

**Auth:** required  
**Permission:** `documents:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 13.15 POST /documents/versions/:versionId/submit-for-review
Envía versión a revisión.

**Auth:** required  
**Permission:** `documents:submit`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

---

### 13.16 POST /documents/versions/:versionId/review
Registra revisión de un revisor.

**Auth:** required  
**Permission:** `documents:review`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "status": "COMPLETED",
  "comment": "string?"
}
```

**Response:** `204 No Content`

**Validaciones:**
- Usuario debe estar asignado como revisor.

---

### 13.17 POST /documents/versions/:versionId/approve
Aprueba una versión (flujo de aprobación explícito).

**Auth:** required  
**Permission:** `documents:approve`  
**Tenant scope:** sí  
**Audit:** sí  
**Headers:** `Idempotency-Key`

**Request:**
```json
{
  "comment": "string?"
}
```

**Response:** `204 No Content`

**Validaciones:**
- Usuario debe ser aprobador en secuencia activa.
- Secuencia de aprobación completada.

**Concurrencia:** se valida `updatedAt` contra el valor del cliente; si cambió, retornar `409 ConcurrentUpdate`.

---

### 13.18 POST /documents/versions/:versionId/reject
Rechaza una versión.

**Auth:** required  
**Permission:** `documents:approve`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "comment": "string"
}
```

**Response:** `204 No Content`

---

### 13.19 POST /documents/versions/:versionId/publish
Publica una versión aprobada.

**Auth:** required  
**Permission:** `documents:publish`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

**Efectos:**
- Actualiza `current_version_id` del documento.
- Cierra aprobaciones abiertas restantes.

---

## 14. Document Distribution

### 14.1 POST /documents/:id/distribute
Distribuye documento a usuarios, departamentos o roles.

**Auth:** required  
**Permission:** `documents:distribute`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "documentVersionId": "uuid",
  "assignedToUserIds": ["uuid"],
  "assignedToDepartmentIds": ["uuid"],
  "assignedToRoleIds": ["uuid"],
  "message": "string?"
}
```

**Response 201:**
```json
{
  "data": [
    {
      "id": "uuid",
      "documentId": "uuid",
      "documentVersionId": "uuid",
      "assignedToUserId": "uuid?",
      "assignedToDepartmentId": "uuid?",
      "assignedToRoleId": "uuid?",
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Reglas:**
- Al menos uno de los arrays debe tener elementos.
- No se duplican destinatarios ya distribuidos para la misma versión (unique constraint en migración SQL).

---

### 14.2 GET /documents/:id/distributions
Lista distribuciones de un documento.

**Auth:** required  
**Permission:** `documents:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 14.3 GET /documents/distributions/:distributionId/acknowledge
Registra acuse de recibo.

**Auth:** required  
**Permission:** `documents:acknowledge`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "ipAddress": "string",
  "userAgent": "string"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "documentDistributionId": "uuid",
    "userId": "uuid",
    "ipAddress": "string",
    "userAgent": "string",
    "acknowledgedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Validaciones:**
- Usuario autenticado debe ser destinatario.
- No duplicado.

---

## 15. Electronic Signatures

### 15.1 POST /documents/versions/:versionId/sign
Registra firma electrónica interna.

**Auth:** required  
**Permission:** `documents:sign`  
**Tenant scope:** sí  
**Audit:** sí  
**Headers:** `Idempotency-Key`

**Request:**
```json
{
  "action": "APPROVE",
  "signedContentHash": "string",
  "signatureHash": "string",
  "metadata": { "reason": "Aprobación final" }
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "uuid",
    "entityType": "DocumentVersion",
    "entityId": "uuid",
    "action": "APPROVE",
    "signedContentHash": "string",
    "signatureHash": "string",
    "ipAddress": "string",
    "userAgent": "string",
    "metadata": {},
    "signedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Reglas:**
- Una vez firmado, el evento es inmutable.
- No se expone esta funcionalidad como firma cualificada (eIDAS/PKI).
- Se registra en audit log automáticamente.

**Errores:**
- `409 AlreadySigned`
- `422 InvalidSigner`

---

### 15.2 GET /documents/versions/:versionId/signatures
Lista eventos de firma de una versión.

**Auth:** required  
**Permission:** `documents:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": { "firstName": "string", "lastName": "string" },
      "action": "APPROVE",
      "signedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 16. Optimistic Locking & Workflows

### 16.1 Regla general
Las operaciones de actualización y workflow utilizan optimistic locking.

El cliente debe enviar el valor conocido de `updatedAt` o `version`.

Header:
```
If-Match: "2024-01-01T00:00:00.000Z"
```

Respuesta en conflicto:
- `409 Conflict`
```json
{
  "error": {
    "code": "CONCURRENT_UPDATE",
    "message": "The resource was modified by another request.",
    "details": [
      {
        "field": "updatedAt",
        "expected": "2024-01-01T00:00:00.000Z",
        "actual": "2024-01-01T00:00:01.000Z"
      }
    ],
    "correlationId": "uuid"
  }
}
```

### 16.2 Recursos sujetos a optimistic locking
- Documents
- DocumentVersions
- DocumentApprovals
- Nonconformities
- CorrectiveActions
- Risks

### 16.3 Workflows por acción explícita
No se permite modificar `status` arbitrariamente por `PATCH`.

Transiciones válidas solo mediante acciones:

| Recurso | Acción | Status origen | Status destino |
|---|---|---|---|
| Document | submit | DRAFT, REJECTED | IN_REVIEW |
| Document | approve | PENDING_APPROVAL | APPROVED |
| Document | reject | PENDING_APPROVAL | REJECTED |
| Document | publish | APPROVED | PUBLISHED |
| Document | obsolete | PUBLISHED, CURRENT | OBSOLETE |
| Document | cancel | DRAFT, IN_REVIEW | CANCELLED |
| DocumentVersion | submit-for-review | DRAFT | IN_REVIEW |
| DocumentVersion | approve | PENDING_APPROVAL | APPROVED |
| DocumentVersion | reject | PENDING_APPROVAL | REJECTED |
| DocumentVersion | publish | APPROVED | PUBLISHED |

Cualquier otra transición retorna `422 Unprocessable Entity`.

### 16.4 Concurrencia en aprobaciones
- `POST /documents/versions/:versionId/approve` valida `If-Match`.
- Si el `updatedAt` de la versión cambió entre la lectura y la aprobación, retorna `409 ConcurrentUpdate`.
- El cliente debe releer y reintentar.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Auditorías, No Conformidades, Riesgos, Indicadores y Notificaciones]

---

## 17. Audit Programs

### 17.1 GET /audit-programs
Lista programas de auditoría del tenant.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre
- `status`: enum
- `periodStart`, `periodEnd`: filtro de fechas
- `responsibleId`: uuid

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string?",
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "responsibleId": "uuid?",
      "responsible": { "id": "uuid", "firstName": "string", "lastName": "string" },
      "status": "PLANNED",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 17.2 POST /audit-programs
Crea un programa de auditoría.

**Auth:** required  
**Permission:** `audits:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string",
  "description": "string?",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "responsibleId": "uuid?"
}
```

**Response 201:** programa creado.

**Errores:**
- `422 InvalidPeriod` (periodEnd < periodStart)

---

### 17.3 GET /audit-programs/:id
Obtiene detalle de programa.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 17.4 PATCH /audit-programs/:id
Actualiza programa.

**Auth:** required  
**Permission:** `audits:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "description": "string?",
  "periodStart": "2024-01-01?",
  "periodEnd": "2024-01-31?",
  "responsibleId": "uuid?",
  "status": "PLANNED?"
}
```

**Response 200:** programa actualizado.

**Validaciones:**
- `periodEnd >= periodStart` si ambos se envían.

---

## 18. Audits

### 18.1 GET /audits
Lista auditorías del tenant.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: título, código
- `status`: enum
- `auditProgramId`: uuid
- `processId`: uuid
- `leadAuditorId`: uuid
- `plannedFrom`, `plannedTo`: fechas
- `sortBy`: `createdAt` | `plannedStart` | `code` (allowlist)
- `sortOrder`: `asc` | `desc`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "auditProgramId": "uuid?",
      "processId": "uuid?",
      "leadAuditorId": "uuid?",
      "code": "AUD-001",
      "title": "string",
      "auditType": "string?",
      "plannedStart": "2024-01-01T00:00:00Z",
      "plannedEnd": "2024-01-01T00:00:00Z",
      "actualStart": "2024-01-01T00:00:00Z?",
      "actualEnd": "2024-01-01T00:00:00Z?",
      "status": "PLANNED",
      "scope": "string?",
      "objective": "string?",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 18.2 POST /audits
Crea una auditoría.

**Auth:** required  
**Permission:** `audits:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "auditProgramId": "uuid?",
  "processId": "uuid?",
  "leadAuditorId": "uuid?",
  "code": "AUD-001",
  "title": "string",
  "auditType": "string?",
  "plannedStart": "2024-01-01T00:00:00Z",
  "plannedEnd": "2024-01-01T00:00:00Z",
  "scope": "string?",
  "objective": "string?"
}
```

**Response 201:** auditoría creada.

**Errores:**
- `409 DuplicateAuditCode`

---

### 18.3 GET /audits/:id
Obtiene detalle de auditoría.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 18.4 PATCH /audits/:id
Actualiza auditoría.

**Auth:** required  
**Permission:** `audits:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "title": "string?",
  "auditType": "string?",
  "plannedStart": "2024-01-01T00:00:00Z?",
  "plannedEnd": "2024-01-01T00:00:00Z?",
  "actualStart": "2024-01-01T00:00:00Z?",
  "actualEnd": "2024-01-01T00:00:00Z?",
  "status": "PLANNED?",
  "scope": "string?",
  "objective": "string?"
}
```

**Response 200:** auditoría actualizada.

---

### 18.5 POST /audits/:id/start
Inicia una auditoría planificada.

**Auth:** required  
**Permission:** `audits:start`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "actualStart": "2024-01-01T00:00:00Z"
}
```

**Response:** `204 No Content`

**Validaciones:**
- Status debe ser `PLANNED`.

---

### 18.6 POST /audits/:id/complete
Completa una auditoría iniciada.

**Auth:** required  
**Permission:** `audits:complete`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "actualEnd": "2024-01-01T00:00:00Z"
}
```

**Response:** `204 No Content`

**Validaciones:**
- Status debe ser `IN_PROGRESS`.

---

### 18.7 POST /audits/:id/cancel
Cancela una auditoría.

**Auth:** required  
**Permission:** `audits:cancel`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "reason": "string"
}
```

**Response:** `204 No Content`

---

## 19. Audit Checklists

### 19.1 GET /audits/:auditId/checklists
Lista checklists de una auditoría.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:** colección.

---

### 19.2 POST /audits/:auditId/checklists
Crea una checklist.

**Auth:** required  
**Permission:** `audits:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string"
}
```

**Response 201:** checklist creada.

---

### 19.3 GET /checklists/:id
Obtiene detalle de checklist con items.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "auditId": "uuid",
    "name": "string",
    "createdAt": "2024-01-01T00:00:00Z",
    "items": [
      {
        "id": "uuid",
        "requirementId": "uuid?",
        "question": "string",
        "response": "string?",
        "evidence": "string?",
        "comments": "string?",
        "sortOrder": 0,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 19.4 POST /checklists/:id/items
Agrega un item a la checklist.

**Auth:** required  
**Permission:** `audits:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "requirementId": "uuid?",
  "question": "string",
  "sortOrder": 0
}
```

**Response 201:** item creado.

---

### 19.5 PATCH /checklist-items/:id
Actualiza un item de checklist.

**Auth:** required  
**Permission:** `audits:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "response": "string?",
  "evidence": "string?",
  "comments": "string?"
}
```

**Response 200:** item actualizado.

---

## 20. Audit Findings

### 20.1 GET /audits/:auditId/findings
Lista hallazgos de una auditoría.

**Auth:** required  
**Permission:** `audits:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `findingType`: enum
- `severity`: enum
- `status`: enum
- `requirementId`: uuid

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "auditId": "uuid",
      "checklistItemId": "uuid?",
      "requirementId": "uuid?",
      "findingType": "NON_CONFORMITY",
      "title": "string",
      "description": "string",
      "evidence": "string?",
      "severity": "MAJOR",
      "identifiedById": "uuid",
      "identifiedBy": { "firstName": "string", "lastName": "string" },
      "identifiedAt": "2024-01-01T00:00:00Z",
      "status": "OPEN",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 20.2 POST /audits/:auditId/findings
Crea un hallazgo.

**Auth:** required  
**Permission:** `audits:createFindings`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "checklistItemId": "uuid?",
  "requirementId": "uuid?",
  "findingType": "NON_CONFORMITY",
  "title": "string",
  "description": "string",
  "evidence": "string?",
  "severity": "MAJOR"
}
```

**Response 201:** hallazgo creado.

**Errores:**
- `422 InvalidFindingType`

---

### 20.3 PATCH /findings/:id
Actualiza hallazgo.

**Auth:** required  
**Permission:** `audits:updateFindings`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "title": "string?",
  "description": "string?",
  "evidence": "string?",
  "severity": "MAJOR?",
  "status": "OPEN?"
}
```

**Response 200:** hallazgo actualizado.

---

## 21. Nonconformities

### 21.1 GET /nonconformities
Lista no conformidades del tenant.

**Auth:** required  
**Permission:** `nonconformities:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: título, código
- `status`: enum
- `severity`: enum
- `auditId`: uuid
- `findingId`: uuid
- `processId`: uuid
- `responsibleId`: uuid
- `sortBy`: `detectedAt` | `createdAt` | `code` (allowlist)
- `sortOrder`: `asc` | `desc`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "auditId": "uuid?",
      "findingId": "uuid?",
      "processId": "uuid?",
      "code": "NC-001",
      "title": "string",
      "description": "string",
      "severity": "MAJOR",
      "detectedAt": "2024-01-01T00:00:00Z",
      "responsibleId": "uuid?",
      "status": "OPEN",
      "closedAt": "2024-01-01T00:00:00Z?",
      "closedBy": { "firstName": "string", "lastName": "string" }?,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 21.2 POST /nonconformities
Crea una no conformidad.

**Auth:** required  
**Permission:** `nonconformities:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "auditId": "uuid?",
  "findingId": "uuid?",
  "processId": "uuid?",
  "code": "NC-001",
  "title": "string",
  "description": "string",
  "severity": "MAJOR",
  "detectedAt": "2024-01-01T00:00:00Z",
  "responsibleId": "uuid?"
}
```

**Response 201:** no conformidad creada.

**Errores:**
- `409 DuplicateNonconformityCode`

---

### 21.3 GET /nonconformities/:id
Obtiene detalle de no conformidad.

**Auth:** required  
**Permission:** `nonconformities:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 21.4 PATCH /nonconformities/:id
Actualiza no conformidad.

**Auth:** required  
**Permission:** `nonconformities:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "title": "string?",
  "description": "string?",
  "severity": "MAJOR?",
  "responsibleId": "uuid?",
  "status": "OPEN?"
}
```

**Response 200:** no conformidad actualizada.

**Errores:**
- `409 ConcurrentUpdate`

---

### 21.5 POST /nonconformities/:id/close
Cierra una no conformidad.

**Auth:** required  
**Permission:** `nonconformities:close`  
**Tenant scope:** sí  
**Audit:** sí

**Response:** `204 No Content`

**Validaciones:**
- Debe tener análisis de causa raíz completado.
- Debe tener todas las acciones correctivas verificadas.

---

## 22. Root Cause Analysis

### 22.1 GET /nonconformities/:nonconformityId/root-cause
Obtiene el análisis de causa raíz de una no conformidad.

**Auth:** required  
**Permission:** `nonconformities:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "nonconformityId": "uuid",
    "methodology": "FIVE_WHY",
    "analysisData": {
      "why1": "...",
      "why2": "...",
      "why3": "...",
      "why4": "...",
      "why5": "..."
    },
    "conclusion": "string?",
    "createdById": "uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 22.2 POST /nonconformities/:nonconformityId/root-cause
Crea análisis de causa raíz.

**Auth:** required  
**Permission:** `nonconformities:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "methodology": "FIVE_WHY",
  "analysisData": { "why1": "...", "why2": "..." },
  "conclusion": "string?"
}
```

**Response 201:** análisis creado.

**Errores:**
- `409 RootCauseAlreadyExists` (1:1 con nonconformity)

---

### 22.3 PATCH /root-cause/:id
Actualiza análisis de causa raíz.

**Auth:** required  
**Permission:** `nonconformities:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "methodology": "FIVE_WHY?",
  "analysisData": { "why1": "..." }?,
  "conclusion": "string?"
}
```

**Response 200:** análisis actualizado.

---

## 23. Corrective Actions

### 23.1 GET /nonconformities/:nonconformityId/corrective-actions
Lista acciones correctivas de una no conformidad.

**Auth:** required  
**Permission:** `nonconformities:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `status`: enum
- `responsibleId`: uuid

**Response 200:** colección.

---

### 23.2 POST /nonconformities/:nonconformityId/corrective-actions
Crea una acción correctiva.

**Auth:** required  
**Permission:** `nonconformities:createActions`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "code": "CA-001",
  "description": "string",
  "responsibleId": "uuid",
  "dueDate": "2024-01-31",
  "effectivenessRequired": true
}
```

**Response 201:** acción creada.

**Errores:**
- `409 DuplicateCorrectiveActionCode`

---

### 23.3 GET /corrective-actions/:id
Obtiene detalle de acción correctiva.

**Auth:** required  
**Permission:** `nonconformities:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 23.4 PATCH /corrective-actions/:id
Actualiza acción correctiva.

**Auth:** required  
**Permission:** `nonconformities:updateActions`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "description": "string?",
  "responsibleId": "uuid?",
  "dueDate": "2024-01-31?",
  "status": "IN_PROGRESS?",
  "effectivenessRequired": true
}
```

**Response 200:** acción actualizada.

**Errores:**
- `409 ConcurrentUpdate`

---

### 23.5 POST /corrective-actions/:id/complete
Marca acción como completada.

**Auth:** required  
**Permission:** `nonconformities:updateActions`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "completedAt": "2024-01-01T00:00:00Z"
}
```

**Response:** `204 No Content`

---

### 23.6 POST /corrective-actions/:id/verify
Registra verificación de efectividad.

**Auth:** required  
**Permission:** `nonconformities:verifyActions`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "effectivenessStatus": "EFFECTIVE",
  "evidence": "string?",
  "comments": "string?"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "correctiveActionId": "uuid",
    "verifierId": "uuid",
    "effectivenessStatus": "EFFECTIVE",
    "evidence": "string?",
    "comments": "string?",
    "verifiedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## 24. Risks

### 24.1 GET /risks
Lista riesgos del tenant.

**Auth:** required  
**Permission:** `risks:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: título, código
- `status`: enum
- `riskType`: enum
- `processId`: uuid
- `ownerId`: uuid
- `sortBy`: `createdAt` | `score` | `code` (allowlist)
- `sortOrder`: `asc` | `desc`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "processId": "uuid?",
      "code": "RSK-001",
      "title": "string",
      "description": "string",
      "riskType": "INTERNAL",
      "ownerId": "uuid?",
      "status": "OPEN",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 24.2 POST /risks
Crea un riesgo.

**Auth:** required  
**Permission:** `risks:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "processId": "uuid?",
  "code": "RSK-001",
  "title": "string",
  "description": "string",
  "riskType": "INTERNAL",
  "ownerId": "uuid?"
}
```

**Response 201:** riesgo creado.

**Errores:**
- `409 DuplicateRiskCode`

---

### 24.3 GET /risks/:id
Obtiene detalle de riesgo.

**Auth:** required  
**Permission:** `risks:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 24.4 PATCH /risks/:id
Actualiza riesgo.

**Auth:** required  
**Permission:** `risks:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "title": "string?",
  "description": "string?",
  "riskType": "INTERNAL?",
  "ownerId": "uuid?",
  "status": "OPEN?"
}
```

**Response 200:** riesgo actualizado.

**Errores:**
- `409 ConcurrentUpdate`

---

### 24.5 GET /risks/:id/assessments
Lista evaluaciones de riesgo.

**Auth:** required  
**Permission:** `risks:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "riskId": "uuid",
      "probability": "HIGH",
      "impact": "MEDIUM",
      "score": "12",
      "calculationData": {},
      "assessedById": "uuid",
      "assessedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 24.6 POST /risks/:id/assessments
Crea una evaluación de riesgo.

**Auth:** required  
**Permission:** `risks:assess`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "probability": "HIGH",
  "impact": "MEDIUM",
  "calculationData": {}
}
```

**Response 201:** evaluación creada.

**Nota:** `score` se calcula backend según configuración dinámica del tenant.

---

### 24.7 GET /risks/:id/treatments
Lista tratamientos de riesgo.

**Auth:** required  
**Permission:** `risks:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:** colección.

---

### 24.8 POST /risks/:id/treatments
Crea un tratamiento de riesgo.

**Auth:** required  
**Permission:** `risks:createTreatments`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "strategy": "MITIGATE",
  "description": "string",
  "responsibleId": "uuid?",
  "dueDate": "2024-01-31"
}
```

**Response 201:** tratamiento creado.

**Errores:**
- `422 InvalidStrategy`

---

### 24.9 PATCH /risk-treatments/:id
Actualiza tratamiento.

**Auth:** required  
**Permission:** `risks:updateTreatments`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "strategy": "MITIGATE?",
  "description": "string?",
  "responsibleId": "uuid?",
  "dueDate": "2024-01-31?",
  "status": "PLANNED?",
  "completedAt": "2024-01-01T00:00:00Z?"
}
```

**Response 200:** tratamiento actualizado.

---

## 25. Training

### 25.1 GET /training-courses
Lista cursos del tenant.

**Auth:** required  
**Permission:** `training:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre
- `isActive`: boolean
- `processId`: uuid

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string?",
      "relatedDocumentId": "uuid?",
      "processId": "uuid?",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 25.2 POST /training-courses
Crea un curso.

**Auth:** required  
**Permission:** `training:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string",
  "description": "string?",
  "relatedDocumentId": "uuid?",
  "processId": "uuid?"
}
```

**Response 201:** curso creado.

---

### 25.3 GET /training-courses/:id
Obtiene detalle de curso.

**Auth:** required  
**Permission:** `training:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 25.4 PATCH /training-courses/:id
Actualiza curso.

**Auth:** required  
**Permission:** `training:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "description": "string?",
  "relatedDocumentId": "uuid?",
  "processId": "uuid?",
  "isActive": true
}
```

**Response 200:** curso actualizado.

---

### 25.5 GET /training-courses/:id/sessions
Lista sesiones de un curso.

**Auth:** required  
**Permission:** `training:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:** colección.

---

### 25.6 POST /training-courses/:id/sessions
Crea una sesión.

**Auth:** required  
**Permission:** `training:createSessions`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "instructorId": "uuid?",
  "scheduledAt": "2024-01-01T00:00:00Z",
  "location": "string?",
  "status": "PLANNED"
}
```

**Response 201:** sesión creada.

---

### 25.7 GET /training-sessions/:id
Obtiene detalle de sesión.

**Auth:** required  
**Permission:** `training:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 25.8 PATCH /training-sessions/:id
Actualiza sesión.

**Auth:** required  
**Permission:** `training:updateSessions`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "instructorId": "uuid?",
  "scheduledAt": "2024-01-01T00:00:00Z?",
  "location": "string?",
  "status": "PLANNED?"
}
```

**Response 200:** sesión actualizada.

---

### 25.9 GET /training-sessions/:id/participants
Lista participantes de una sesión.

**Auth:** required  
**Permission:** `training:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "sessionId": "uuid",
      "userId": "uuid",
      "user": { "firstName": "string", "lastName": "string" },
      "attendanceStatus": "PENDING",
      "completedAt": "2024-01-01T00:00:00Z?",
      "evaluationScore": "string?",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 25.10 POST /training-sessions/:id/participants
Registra participante en sesión.

**Auth:** required  
**Permission:** `training:registerParticipants`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response 201:** participación registrada.

**Errores:**
- `409 ParticipantAlreadyRegistered`

---

### 25.11 PATCH /training-sessions/:id/participants/:userId
Actualiza asistencia/evaluación.

**Auth:** required  
**Permission:** `training:updateParticipants`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "attendanceStatus": "PRESENT",
  "evaluationScore": "9.5",
  "completedAt": "2024-01-01T00:00:00Z"
}
```

**Response 200:** participación actualizada.

---

## 26. Indicators

### 26.1 GET /indicators
Lista indicadores del tenant.

**Auth:** required  
**Permission:** `indicators:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `search`: nombre, código
- `processId`: uuid
- `responsibleId`: uuid
- `isActive`: boolean
- `sortBy`: `createdAt` | `code` | `name` (allowlist)
- `sortOrder`: `asc` | `desc`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "processId": "uuid?",
      "code": "IND-001",
      "name": "string",
      "description": "string?",
      "unit": "string?",
      "targetValue": "string?",
      "calculationDefinition": {},
      "responsibleId": "uuid?",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 26.2 POST /indicators
Crea un indicador.

**Auth:** required  
**Permission:** `indicators:create`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "processId": "uuid?",
  "code": "IND-001",
  "name": "string",
  "description": "string?",
  "unit": "string?",
  "targetValue": "string?",
  "calculationDefinition": { "formula": "string", "periodicity": "monthly" },
  "responsibleId": "uuid?"
}
```

**Response 201:** indicador creado.

**Errores:**
- `409 DuplicateIndicatorCode`

---

### 26.3 GET /indicators/:id
Obtiene detalle de indicador.

**Auth:** required  
**Permission:** `indicators:read`  
**Tenant scope:** sí  
**Audit:** no

---

### 26.4 PATCH /indicators/:id
Actualiza indicador.

**Auth:** required  
**Permission:** `indicators:update`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "name": "string?",
  "description": "string?",
  "unit": "string?",
  "targetValue": "string?",
  "calculationDefinition": {}?,
  "responsibleId": "uuid?",
  "isActive": true
}
```

**Response 200:** indicador actualizado.

---

### 26.5 GET /indicators/:id/measurements
Lista mediciones de un indicador.

**Auth:** required  
**Permission:** `indicators:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `measuredFrom`, `measuredTo`: fechas
- `recordedById`: uuid

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "indicatorId": "uuid",
      "measurementDate": "2024-01-01",
      "value": "string",
      "targetValue": "string?",
      "comments": "string?",
      "recordedById": "uuid?",
      "recordedBy": { "firstName": "string", "lastName": "string" },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 26.6 POST /indicators/:id/measurements
Registra una medición.

**Auth:** required  
**Permission:** `indicators:record`  
**Tenant scope:** sí  
**Audit:** sí

**Request:**
```json
{
  "measurementDate": "2024-01-01",
  "value": "string",
  "targetValue": "string?",
  "comments": "string?"
}
```

**Response 201:** medición registrada.

---

## 27. Notifications

### 27.1 GET /notifications
Lista notificaciones del usuario autenticado.

**Auth:** required  
**Permission:** `notifications:read`  
**Tenant scope:** sí  
**Audit:** no

**Query params:**
- `page`, `pageSize`
- `read`: boolean (true para leídas, false para no leídas)
- `type`: string

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "string",
      "title": "string",
      "message": "string",
      "entityType": "string?",
      "entityId": "uuid?",
      "readAt": "2024-01-01T00:00:00Z?",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

---

### 27.2 GET /notifications/unread-count
Obtiene cantidad de notificaciones no leídas.

**Auth:** required  
**Permission:** `notifications:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": {
    "unreadCount": 5
  }
}
```

---

### 27.3 POST /notifications/:id/read
Marca notificación como leída.

**Auth:** required  
**Permission:** `notifications:read`  
**Tenant scope:** sí  
**Audit:** no

**Response:** `204 No Content`

---

### 27.4 POST /notifications/mark-all-read
Marca todas las notificaciones como leídas.

**Auth:** required  
**Permission:** `notifications:read`  
**Tenant scope:** sí  
**Audit:** no

**Response:** `204 No Content`

---

### 27.5 GET /notification-preferences
Obtiene preferencias de notificación del usuario.

**Auth:** required  
**Permission:** `notifications:read`  
**Tenant scope:** sí  
**Audit:** no

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "notificationType": "AUDIT_ASSIGNED",
      "inAppEnabled": true,
      "emailEnabled": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 27.6 PATCH /notification-preferences/:id
Actualiza preferencia.

**Auth:** required  
**Permission:** `notifications:updatePreferences`  
**Tenant scope:** sí  
**Audit:** no

**Request:**
```json
{
  "inAppEnabled": true,
  "emailEnabled": false
}
```

**Response 200:** preferencia actualizada.

---

## 28. Audit Log (Read-Only)

### 28.1 GET /audit-logs
Consulta registros de auditoría.

**Auth:** required  
**Permission:** `audit-logs:read`  
**Tenant scope:** sí  
**Audit:** no

**Restricción:** este endpoint es de solo lectura. No se permite crear, modificar ni eliminar registros.

**Query params:**
- `page`, `pageSize`
- `action`: string
- `entityType`: string
- `entityId`: uuid
- `actorId`: uuid
- `correlationId`: string
- `createdFrom`, `createdTo`: timestamps
- `sortBy`: `createdAt` | `action` | `entityType` (allowlist)
- `sortOrder`: `asc` | `desc`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "actorId": "uuid?",
      "actor": { "firstName": "string", "lastName": "string", "email": "string" }?,
      "action": "DOCUMENT_APPROVED",
      "entityType": "DocumentVersion",
      "entityId": "uuid",
      "payload": {},
      "ipAddress": "string?",
      "userAgent": "string?",
      "correlationId": "uuid",
      "previousHash": "string?",
      "eventHash": "string",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "totalPages": 1 }
}
```

**Reglas:**
- No se exponen operaciones POST/PATCH/DELETE.
- Filtros por fecha tienen límite máximo (ej: 90 días) para evitar consultas extremas.
- `payload` se expone solo si el usuario tiene permiso de auditoría elevado; de lo contrario, se oculta.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Matrices, Seguridad y Definition of Done]

---

## 29. API Endpoint Matrix

| Module | Method | Path | Auth | Permission | Tenant | Audit | Description |
|---|---|---|---|---|---|---|---|
| Health | GET | /health | public | - | no | no | Estado general del servicio |
| Health | GET | /health/live | public | - | no | no | Liveness probe |
| Health | GET | /health/ready | public | - | no | no | Readiness probe |
| Auth | POST | /auth/login | public | - | no | yes | Autentica usuario |
| Auth | POST | /auth/logout | required | auth:logout | yes | yes | Revoca refresh token |
| Auth | POST | /auth/refresh | public | - | no | yes | Rota access token |
| Auth | POST | /auth/forgot-password | public | - | no | yes | Inicia recuperación de contraseña |
| Auth | POST | /auth/reset-password | public | - | no | yes | Consume token de recuperación |
| Auth | POST | /auth/change-password | required | auth:changePassword | yes | yes | Cambia contraseña |
| Auth | GET | /auth/me | required | auth:read | yes | no | Perfil del usuario autenticado |
| MFA | POST | /auth/mfa/enroll | required | mfa:manage | yes | yes | Genera secreto TOTP |
| MFA | POST | /auth/mfa/verify | required | mfa:manage | yes | yes | Verifica y activa MFA |
| MFA | POST | /auth/mfa/disable | required | mfa:manage | yes | yes | Desactiva MFA |
| MFA | POST | /auth/mfa/recovery-codes/regenerate | required | mfa:manage | yes | yes | Regenera códigos de recuperación |
| MFA | GET | /auth/mfa/status | required | mfa:read | yes | no | Consulta estado de MFA |
| Users | GET | /users | required | users:read | yes | no | Lista usuarios |
| Users | POST | /users | required | users:create | yes | yes | Crea usuario |
| Users | GET | /users/:id | required | users:read | yes | no | Detalle de usuario |
| Users | PATCH | /users/:id | required | users:update | yes | yes | Actualiza usuario |
| Users | POST | /users/:id/activate | required | users:activate | yes | yes | Reactiva usuario |
| Users | POST | /users/:id/deactivate | required | users:deactivate | yes | yes | Desactiva usuario |
| Users | POST | /users/:id/roles | required | users:assignRoles | yes | yes | Asigna roles |
| Users | GET | /users/:id/permissions | required | users:read | yes | no | Permisos efectivos |
| Roles | GET | /roles | required | roles:read | yes | no | Lista roles |
| Roles | POST | /roles | required | roles:create | yes | yes | Crea rol |
| Roles | GET | /roles/:id | required | roles:read | yes | no | Detalle de rol |
| Roles | PATCH | /roles/:id | required | roles:update | yes | yes | Actualiza rol |
| Roles | POST | /roles/:id/deactivate | required | roles:deactivate | yes | yes | Desactiva rol |
| Roles | GET | /roles/:id/permissions | required | roles:read | yes | no | Permisos del rol |
| Roles | POST | /roles/:id/permissions | required | roles:update | yes | yes | Agrega permisos |
| Roles | DELETE | /roles/:id/permissions/:permissionId | required | roles:update | yes | yes | Remueve permiso |
| Permissions | GET | /permissions | required | permissions:read | no | no | Catálogo global de permisos |
| Organization | GET | /organization | required | organization:read | yes | no | Datos de la organización |
| Organization | PATCH | /organization | required | organization:update | yes | yes | Actualiza organización |
| Organization | GET | /organization/settings | required | organization:read | yes | no | Configuración de la organización |
| Organization | PATCH | /organization/settings | required | organization:updateSettings | yes | yes | Actualiza configuración |
| Organization | GET | /organization/standards | required | organization:read | yes | no | Estándares adoptados |
| Organization | POST | /organization/standards | required | organization:updateStandards | yes | yes | Adopta estándar |
| Organization | PATCH | /organization/standards/:standardId | required | organization:updateStandards | yes | yes | Actualiza estándar adoptado |
| Departments | GET | /departments | required | departments:read | yes | no | Lista departamentos |
| Departments | POST | /departments | required | departments:create | yes | yes | Crea departamento |
| Departments | GET | /departments/:id | required | departments:read | yes | no | Detalle de departamento |
| Departments | PATCH | /departments/:id | required | departments:update | yes | yes | Actualiza departamento |
| Departments | POST | /departments/:id/deactivate | required | departments:deactivate | yes | yes | Desactiva departamento |
| Areas | GET | /areas | required | areas:read | yes | no | Lista áreas |
| Areas | POST | /areas | required | areas:create | yes | yes | Crea área |
| Areas | GET | /areas/:id | required | areas:read | yes | no | Detalle de área |
| Areas | PATCH | /areas/:id | required | areas:update | yes | yes | Actualiza área |
| Areas | POST | /areas/:id/deactivate | required | areas:deactivate | yes | yes | Desactiva área |
| File Assets | POST | /file-assets/upload-url | required | files:upload | yes | yes | Solicita URL presignada |
| File Assets | POST | /file-assets/confirm | required | files:upload | yes | yes | Confirma upload |
| File Assets | GET | /file-assets/:id/download-url | required | files:read | yes | yes | URL de descarga |
| File Assets | GET | /file-assets | required | files:read | yes | no | Lista archivos |
| Processes | GET | /processes | required | processes:read | yes | no | Lista procesos |
| Processes | POST | /processes | required | processes:create | yes | yes | Crea proceso |
| Processes | GET | /processes/:id | required | processes:read | yes | no | Detalle de proceso |
| Processes | PATCH | /processes/:id | required | processes:update | yes | yes | Actualiza proceso |
| Processes | POST | /processes/:id/deactivate | required | processes:deactivate | yes | yes | Desactiva proceso |
| Standards | GET | /standards | required | standards:read | no | no | Catálogo global de estándares |
| Standards | GET | /standards/:id | required | standards:read | no | no | Detalle de estándar |
| Standards | GET | /standards/:id/requirements | required | standards:read | no | no | Requisitos del estándar |
| Standards | POST | /organization/standards | required | organization:updateStandards | yes | yes | Adopta estándar |
| Standards | PATCH | /organization/standards/:standardId | required | organization:updateStandards | yes | yes | Actualiza estándar adoptado |
| Documents | GET | /documents | required | documents:read | yes | no | Lista documentos |
| Documents | POST | /documents | required | documents:create | yes | yes | Crea documento |
| Documents | GET | /documents/:id | required | documents:read | yes | no | Detalle de documento |
| Documents | PATCH | /documents/:id | required | documents:update | yes | yes | Actualiza documento |
| Documents | POST | /documents/:id/submit | required | documents:submit | yes | yes | Envía a revisión |
| Documents | POST | /documents/:id/submit-for-approval | required | documents:approve | yes | yes | Envía a aprobación |
| Documents | POST | /documents/:id/approve | required | documents:approve | yes | yes | Aprueba documento |
| Documents | POST | /documents/:id/reject | required | documents:approve | yes | yes | Rechaza documento |
| Documents | POST | /documents/:id/publish | required | documents:publish | yes | yes | Publica documento |
| Documents | POST | /documents/:id/obsolete | required | documents:obsolete | yes | yes | Marca obsoleto |
| Documents | POST | /documents/:id/cancel | required | documents:cancel | yes | yes | Cancela documento |
| Documents | POST | /documents/:id/versions | required | documents:createVersion | yes | yes | Crea nueva versión |
| Documents | GET | /documents/:id/versions | required | documents:read | yes | no | Lista versiones |
| Documents | GET | /documents/versions/:versionId | required | documents:read | yes | no | Detalle de versión |
| Documents | POST | /documents/versions/:versionId/submit-for-review | required | documents:submit | yes | yes | Envía versión a revisión |
| Documents | POST | /documents/versions/:versionId/review | required | documents:review | yes | yes | Registra revisión |
| Documents | POST | /documents/versions/:versionId/approve | required | documents:approve | yes | yes | Aprueba versión |
| Documents | POST | /documents/versions/:versionId/reject | required | documents:approve | yes | yes | Rechaza versión |
| Documents | POST | /documents/versions/:versionId/publish | required | documents:publish | yes | yes | Publica versión |
| Documents | POST | /documents/:id/distribute | required | documents:distribute | yes | yes | Distribuye documento |
| Documents | GET | /documents/:id/distributions | required | documents:read | yes | no | Lista distribuciones |
| Documents | POST | /documents/versions/:versionId/sign | required | documents:sign | yes | yes | Firma electrónica |
| Documents | GET | /documents/versions/:versionId/signatures | required | documents:read | yes | no | Lista firmas |
| Audit Programs | GET | /audit-programs | required | audits:read | yes | no | Lista programas |
| Audit Programs | POST | /audit-programs | required | audits:create | yes | yes | Crea programa |
| Audit Programs | GET | /audit-programs/:id | required | audits:read | yes | no | Detalle de programa |
| Audit Programs | PATCH | /audit-programs/:id | required | audits:update | yes | yes | Actualiza programa |
| Audits | GET | /audits | required | audits:read | yes | no | Lista auditorías |
| Audits | POST | /audits | required | audits:create | yes | yes | Crea auditoría |
| Audits | GET | /audits/:id | required | audits:read | yes | no | Detalle de auditoría |
| Audits | PATCH | /audits/:id | required | audits:update | yes | yes | Actualiza auditoría |
| Audits | POST | /audits/:id/start | required | audits:start | yes | yes | Inicia auditoría |
| Audits | POST | /audits/:id/complete | required | audits:complete | yes | yes | Completa auditoría |
| Audits | POST | /audits/:id/cancel | required | audits:cancel | yes | yes | Cancela auditoría |
| Checklists | GET | /audits/:auditId/checklists | required | audits:read | yes | no | Lista checklists |
| Checklists | POST | /audits/:auditId/checklists | required | audits:update | yes | yes | Crea checklist |
| Checklists | GET | /checklists/:id | required | audits:read | yes | no | Detalle de checklist |
| Checklists | POST | /checklists/:id/items | required | audits:update | yes | yes | Agrega item |
| Checklists | PATCH | /checklist-items/:id | required | audits:update | yes | yes | Actualiza item |
| Findings | GET | /audits/:auditId/findings | required | audits:read | yes | no | Lista hallazgos |
| Findings | POST | /audits/:auditId/findings | required | audits:createFindings | yes | yes | Crea hallazgo |
| Findings | PATCH | /findings/:id | required | audits:updateFindings | yes | yes | Actualiza hallazgo |
| Nonconformities | GET | /nonconformities | required | nonconformities:read | yes | no | Lista no conformidades |
| Nonconformities | POST | /nonconformities | required | nonconformities:create | yes | yes | Crea no conformidad |
| Nonconformities | GET | /nonconformities/:id | required | nonconformities:read | yes | no | Detalle de no conformidad |
| Nonconformities | PATCH | /nonconformities/:id | required | nonconformities:update | yes | yes | Actualiza no conformidad |
| Nonconformities | POST | /nonconformities/:id/close | required | nonconformities:close | yes | yes | Cierra no conformidad |
| Root Cause | GET | /nonconformities/:nonconformityId/root-cause | required | nonconformities:read | yes | no | Obtiene análisis |
| Root Cause | POST | /nonconformities/:nonconformityId/root-cause | required | nonconformities:update | yes | yes | Crea análisis |
| Root Cause | PATCH | /root-cause/:id | required | nonconformities:update | yes | yes | Actualiza análisis |
| Corrective Actions | GET | /nonconformities/:nonconformityId/corrective-actions | required | nonconformities:read | yes | no | Lista acciones |
| Corrective Actions | POST | /nonconformities/:nonconformityId/corrective-actions | required | nonconformities:createActions | yes | yes | Crea acción |
| Corrective Actions | GET | /corrective-actions/:id | required | nonconformities:read | yes | no | Detalle de acción |
| Corrective Actions | PATCH | /corrective-actions/:id | required | nonconformities:updateActions | yes | yes | Actualiza acción |
| Corrective Actions | POST | /corrective-actions/:id/complete | required | nonconformities:updateActions | yes | yes | Marca completada |
| Corrective Actions | POST | /corrective-actions/:id/verify | required | nonconformities:verifyActions | yes | yes | Verifica efectividad |
| Risks | GET | /risks | required | risks:read | yes | no | Lista riesgos |
| Risks | POST | /risks | required | risks:create | yes | yes | Crea riesgo |
| Risks | GET | /risks/:id | required | risks:read | yes | no | Detalle de riesgo |
| Risks | PATCH | /risks/:id | required | risks:update | yes | yes | Actualiza riesgo |
| Risks | GET | /risks/:id/assessments | required | risks:read | yes | no | Lista evaluaciones |
| Risks | POST | /risks/:id/assessments | required | risks:assess | yes | yes | Crea evaluación |
| Risks | GET | /risks/:id/treatments | required | risks:read | yes | no | Lista tratamientos |
| Risks | POST | /risks/:id/treatments | required | risks:createTreatments | yes | yes | Crea tratamiento |
| Risks | PATCH | /risk-treatments/:id | required | risks:updateTreatments | yes | yes | Actualiza tratamiento |
| Training | GET | /training-courses | required | training:read | yes | no | Lista cursos |
| Training | POST | /training-courses | required | training:create | yes | yes | Crea curso |
| Training | GET | /training-courses/:id | required | training:read | yes | no | Detalle de curso |
| Training | PATCH | /training-courses/:id | required | training:update | yes | yes | Actualiza curso |
| Training | GET | /training-courses/:id/sessions | required | training:read | yes | no | Lista sesiones |
| Training | POST | /training-courses/:id/sessions | required | training:createSessions | yes | yes | Crea sesión |
| Training | GET | /training-sessions/:id | required | training:read | yes | no | Detalle de sesión |
| Training | PATCH | /training-sessions/:id | required | training:updateSessions | yes | yes | Actualiza sesión |
| Training | GET | /training-sessions/:id/participants | required | training:read | yes | no | Lista participantes |
| Training | POST | /training-sessions/:id/participants | required | training:registerParticipants | yes | yes | Registra participante |
| Training | PATCH | /training-sessions/:id/participants/:userId | required | training:updateParticipants | yes | yes | Actualiza participación |
| Indicators | GET | /indicators | required | indicators:read | yes | no | Lista indicadores |
| Indicators | POST | /indicators | required | indicators:create | yes | yes | Crea indicador |
| Indicators | GET | /indicators/:id | required | indicators:read | yes | no | Detalle de indicador |
| Indicators | PATCH | /indicators/:id | required | indicators:update | yes | yes | Actualiza indicador |
| Indicators | GET | /indicators/:id/measurements | required | indicators:read | yes | no | Lista mediciones |
| Indicators | POST | /indicators/:id/measurements | required | indicators:record | yes | yes | Registra medición |
| Notifications | GET | /notifications | required | notifications:read | yes | no | Lista notificaciones |
| Notifications | GET | /notifications/unread-count | required | notifications:read | yes | no | Conteo de no leídas |
| Notifications | POST | /notifications/:id/read | required | notifications:read | yes | no | Marca como leída |
| Notifications | POST | /notifications/mark-all-read | required | notifications:read | yes | no | Marca todas como leídas |
| Notifications | GET | /notification-preferences | required | notifications:read | yes | no | Preferencias de notificación |
| Notifications | PATCH | /notification-preferences/:id | required | notifications:updatePreferences | yes | no | Actualiza preferencia |
| Audit Log | GET | /audit-logs | required | audit-logs:read | yes | no | Consulta registros de auditoría |

---

## 30. API Contract Matrix

| Resource | Create | Read | List | Update | Deactivate | Actions |
|---|---|---|---|---|---|---|
| Users | POST /users | GET /users/:id | GET /users | PATCH /users/:id | POST /users/:id/deactivate | POST /users/:id/roles, GET /users/:id/permissions |
| Roles | POST /roles | GET /roles/:id | GET /roles | PATCH /roles/:id | POST /roles/:id/deactivate | POST /roles/:id/permissions, DELETE /roles/:id/permissions/:permissionId |
| Departments | POST /departments | GET /departments/:id | GET /departments | PATCH /departments/:id | POST /departments/:id/deactivate | - |
| Areas | POST /areas | GET /areas/:id | GET /areas | PATCH /areas/:id | POST /areas/:id/deactivate | - |
| Processes | POST /processes | GET /processes/:id | GET /processes | PATCH /processes/:id | POST /processes/:id/deactivate | - |
| Documents | POST /documents | GET /documents/:id | GET /documents | PATCH /documents/:id | - | POST /documents/:id/submit, POST /documents/:id/submit-for-approval, POST /documents/:id/approve, POST /documents/:id/reject, POST /documents/:id/publish, POST /documents/:id/obsolete, POST /documents/:id/cancel, POST /documents/:id/versions, POST /documents/:id/distribute |
| Document Versions | POST /documents/:id/versions | GET /documents/versions/:versionId | GET /documents/:id/versions | - | - | POST /documents/versions/:versionId/submit-for-review, POST /documents/versions/:versionId/approve, POST /documents/versions/:versionId/reject, POST /documents/versions/:versionId/publish, POST /documents/versions/:versionId/sign |
| Audit Programs | POST /audit-programs | GET /audit-programs/:id | GET /audit-programs | PATCH /audit-programs/:id | - | - |
| Audits | POST /audits | GET /audits/:id | GET /audits | PATCH /audits/:id | - | POST /audits/:id/start, POST /audits/:id/complete, POST /audits/:id/cancel |
| Checklists | POST /audits/:auditId/checklists | GET /checklists/:id | GET /audits/:auditId/checklists | PATCH /checklist-items/:id | - | POST /checklists/:id/items |
| Findings | POST /audits/:auditId/findings | GET /findings/:id | GET /audits/:auditId/findings | PATCH /findings/:id | - | - |
| Nonconformities | POST /nonconformities | GET /nonconformities/:id | GET /nonconformities | PATCH /nonconformities/:id | - | POST /nonconformities/:id/close, POST /nonconformities/:id/root-cause, POST /nonconformities/:id/corrective-actions |
| Root Cause | - | GET /nonconformities/:nonconformityId/root-cause | - | PATCH /root-cause/:id | - | - |
| Corrective Actions | POST /nonconformities/:nonconformityId/corrective-actions | GET /corrective-actions/:id | GET /nonconformities/:nonconformityId/corrective-actions | PATCH /corrective-actions/:id | - | POST /corrective-actions/:id/complete, POST /corrective-actions/:id/verify |
| Risks | POST /risks | GET /risks/:id | GET /risks | PATCH /risks/:id | - | POST /risks/:id/assessments, POST /risks/:id/treatments, PATCH /risk-treatments/:id |
| Training Courses | POST /training-courses | GET /training-courses/:id | GET /training-courses | PATCH /training-courses/:id | - | POST /training-courses/:id/sessions |
| Training Sessions | POST /training-courses/:id/sessions | GET /training-sessions/:id | GET /training-courses/:id/sessions | PATCH /training-sessions/:id | - | POST /training-sessions/:id/participants, PATCH /training-sessions/:id/participants/:userId |
| Indicators | POST /indicators | GET /indicators/:id | GET /indicators | PATCH /indicators/:id | - | POST /indicators/:id/measurements |
| Notifications | - | - | GET /notifications | - | - | POST /notifications/:id/read, POST /notifications/mark-all-read |
| Notification Preferences | - | GET /notification-preferences | - | PATCH /notification-preferences/:id | - | - |
| Audit Log | - | - | GET /audit-logs | - | - | - |
| File Assets | POST /file-assets/confirm | GET /file-assets/:id/download-url | GET /file-assets | - | - | POST /file-assets/upload-url |

---

## 31. Security Matrix

| Endpoint | Authentication | Permission | Tenant Isolation | Rate Limit | Audit |
|---|---|---|---|---|---|
| /health | public | - | no | no | no |
| /health/live | public | - | no | no | no |
| /health/ready | public | - | no | no | no |
| /auth/login | public | - | no | AUTH | yes |
| /auth/logout | required | auth:logout | yes | AUTH | yes |
| /auth/refresh | public | - | no | AUTH | yes |
| /auth/forgot-password | public | - | no | PASSWORD_RESET | yes |
| /auth/reset-password | public | - | no | PASSWORD_RESET | yes |
| /auth/change-password | required | auth:changePassword | yes | AUTH | yes |
| /auth/me | required | auth:read | yes | API | no |
| /auth/mfa/* | required | mfa:manage | yes | MFA | yes |
| /users | required | users:read | yes | API | no |
| /users | required | users:create | yes | API | yes |
| /users/:id | required | users:read | yes | API | no |
| /users/:id | required | users:update | yes | API | yes |
| /users/:id/activate | required | users:activate | yes | API | yes |
| /users/:id/deactivate | required | users:deactivate | yes | API | yes |
| /users/:id/roles | required | users:assignRoles | yes | API | yes |
| /users/:id/permissions | required | users:read | yes | API | no |
| /roles | required | roles:read | yes | API | no |
| /roles | required | roles:create | yes | API | yes |
| /roles/:id | required | roles:read | yes | API | no |
| /roles/:id | required | roles:update | yes | API | yes |
| /roles/:id/deactivate | required | roles:deactivate | yes | API | yes |
| /roles/:id/permissions | required | roles:read | yes | API | no |
| /roles/:id/permissions | required | roles:update | yes | API | yes |
| /roles/:id/permissions/:permissionId | required | roles:update | yes | API | yes |
| /permissions | required | permissions:read | no | API | no |
| /organization | required | organization:read | yes | API | no |
| /organization | required | organization:update | yes | API | yes |
| /organization/settings | required | organization:read | yes | API | no |
| /organization/settings | required | organization:updateSettings | yes | API | yes |
| /organization/standards | required | organization:read | yes | API | no |
| /organization/standards | required | organization:updateStandards | yes | API | yes |
| /organization/standards/:standardId | required | organization:updateStandards | yes | API | yes |
| /departments | required | departments:read | yes | API | no |
| /departments | required | departments:create | yes | API | yes |
| /departments/:id | required | departments:read | yes | API | no |
| /departments/:id | required | departments:update | yes | API | yes |
| /departments/:id/deactivate | required | departments:deactivate | yes | API | yes |
| /areas | required | areas:read | yes | API | no |
| /areas | required | areas:create | yes | API | yes |
| /areas/:id | required | areas:read | yes | API | no |
| /areas/:id | required | areas:update | yes | API | yes |
| /areas/:id/deactivate | required | areas:deactivate | yes | API | yes |
| /file-assets/upload-url | required | files:upload | yes | UPLOAD | yes |
| /file-assets/confirm | required | files:upload | yes | UPLOAD | yes |
| /file-assets/:id/download-url | required | files:read | yes | API | yes |
| /file-assets | required | files:read | yes | API | no |
| /processes | required | processes:read | yes | API | no |
| /processes | required | processes:create | yes | API | yes |
| /processes/:id | required | processes:read | yes | API | no |
| /processes/:id | required | processes:update | yes | API | yes |
| /processes/:id/deactivate | required | processes:deactivate | yes | API | yes |
| /standards | required | standards:read | no | API | no |
| /standards/:id | required | standards:read | no | API | no |
| /standards/:id/requirements | required | standards:read | no | API | no |
| /organization/standards | required | organization:updateStandards | yes | API | yes |
| /organization/standards/:standardId | required | organization:updateStandards | yes | API | yes |
| /documents | required | documents:read | yes | API | no |
| /documents | required | documents:create | yes | API | yes |
| /documents/:id | required | documents:read | yes | API | no |
| /documents/:id | required | documents:update | yes | API | yes |
| /documents/:id/submit | required | documents:submit | yes | API | yes |
| /documents/:id/submit-for-approval | required | documents:approve | yes | API | yes |
| /documents/:id/approve | required | documents:approve | yes | API | yes |
| /documents/:id/reject | required | documents:approve | yes | API | yes |
| /documents/:id/publish | required | documents:publish | yes | API | yes |
| /documents/:id/obsolete | required | documents:obsolete | yes | API | yes |
| /documents/:id/cancel | required | documents:cancel | yes | API | yes |
| /documents/:id/versions | required | documents:createVersion | yes | API | yes |
| /documents/:id/versions | required | documents:read | yes | API | no |
| /documents/versions/:versionId | required | documents:read | yes | API | no |
| /documents/versions/:versionId/submit-for-review | required | documents:submit | yes | API | yes |
| /documents/versions/:versionId/review | required | documents:review | yes | API | yes |
| /documents/versions/:versionId/approve | required | documents:approve | yes | API | yes |
| /documents/versions/:versionId/reject | required | documents:approve | yes | API | yes |
| /documents/versions/:versionId/publish | required | documents:publish | yes | API | yes |
| /documents/:id/distribute | required | documents:distribute | yes | API | yes |
| /documents/:id/distributions | required | documents:read | yes | API | no |
| /documents/versions/:versionId/sign | required | documents:sign | yes | API | yes |
| /documents/versions/:versionId/signatures | required | documents:read | yes | API | no |
| /audit-programs | required | audits:read | yes | API | no |
| /audit-programs | required | audits:create | yes | API | yes |
| /audit-programs/:id | required | audits:read | yes | API | no |
| /audit-programs/:id | required | audits:update | yes | API | yes |
| /audits | required | audits:read | yes | API | no |
| /audits | required | audits:create | yes | API | yes |
| /audits/:id | required | audits:read | yes | API | no |
| /audits/:id | required | audits:update | yes | API | yes |
| /audits/:id/start | required | audits:start | yes | API | yes |
| /audits/:id/complete | required | audits:complete | yes | API | yes |
| /audits/:id/cancel | required | audits:cancel | yes | API | yes |
| /audits/:auditId/checklists | required | audits:read | yes | API | no |
| /audits/:auditId/checklists | required | audits:update | yes | API | yes |
| /checklists/:id | required | audits:read | yes | API | no |
| /checklists/:id/items | required | audits:update | yes | API | yes |
| /checklist-items/:id | required | audits:update | yes | API | yes |
| /audits/:auditId/findings | required | audits:read | yes | API | no |
| /audits/:auditId/findings | required | audits:createFindings | yes | API | yes |
| /findings/:id | required | audits:updateFindings | yes | API | yes |
| /nonconformities | required | nonconformities:read | yes | API | no |
| /nonconformities | required | nonconformities:create | yes | API | yes |
| /nonconformities/:id | required | nonconformities:read | yes | API | no |
| /nonconformities/:id | required | nonconformities:update | yes | API | yes |
| /nonconformities/:id/close | required | nonconformities:close | yes | API | yes |
| /nonconformities/:nonconformityId/root-cause | required | nonconformities:read | yes | API | no |
| /nonconformities/:nonconformityId/root-cause | required | nonconformities:update | yes | API | yes |
| /root-cause/:id | required | nonconformities:update | yes | API | yes |
| /nonconformities/:nonconformityId/corrective-actions | required | nonconformities:read | yes | API | no |
| /nonconformities/:nonconformityId/corrective-actions | required | nonconformities:createActions | yes | API | yes |
| /corrective-actions/:id | required | nonconformities:read | yes | API | no |
| /corrective-actions/:id | required | nonconformities:updateActions | yes | API | yes |
| /corrective-actions/:id/complete | required | nonconformities:updateActions | yes | API | yes |
| /corrective-actions/:id/verify | required | nonconformities:verifyActions | yes | API | yes |
| /risks | required | risks:read | yes | API | no |
| /risks | required | risks:create | yes | API | yes |
| /risks/:id | required | risks:read | yes | API | no |
| /risks/:id | required | risks:update | yes | API | yes |
| /risks/:id/assessments | required | risks:read | yes | API | no |
| /risks/:id/assessments | required | risks:assess | yes | API | yes |
| /risks/:id/treatments | required | risks:read | yes | API | no |
| /risks/:id/treatments | required | risks:createTreatments | yes | API | yes |
| /risk-treatments/:id | required | risks:updateTreatments | yes | API | yes |
| /training-courses | required | training:read | yes | API | no |
| /training-courses | required | training:create | yes | API | yes |
| /training-courses/:id | required | training:read | yes | API | no |
| /training-courses/:id | required | training:update | yes | API | yes |
| /training-courses/:id/sessions | required | training:read | yes | API | no |
| /training-courses/:id/sessions | required | training:createSessions | yes | API | yes |
| /training-sessions/:id | required | training:read | yes | API | no |
| /training-sessions/:id | required | training:updateSessions | yes | API | yes |
| /training-sessions/:id/participants | required | training:read | yes | API | no |
| /training-sessions/:id/participants | required | training:registerParticipants | yes | API | yes |
| /training-sessions/:id/participants/:userId | required | training:updateParticipants | yes | API | yes |
| /indicators | required | indicators:read | yes | API | no |
| /indicators | required | indicators:create | yes | API | yes |
| /indicators/:id | required | indicators:read | yes | API | no |
| /indicators/:id | required | indicators:update | yes | API | yes |
| /indicators/:id/measurements | required | indicators:read | yes | API | no |
| /indicators/:id/measurements | required | indicators:record | yes | API | yes |
| /notifications | required | notifications:read | yes | API | no |
| /notifications/unread-count | required | notifications:read | yes | API | no |
| /notifications/:id/read | required | notifications:read | yes | API | no |
| /notifications/mark-all-read | required | notifications:read | yes | API | no |
| /notification-preferences | required | notifications:read | yes | API | no |
| /notification-preferences/:id | required | notifications:updatePreferences | yes | API | no |
| /audit-logs | required | audit-logs:read | yes | API | no |

---

## 32. Definition of Done

La especificación API_SPEC.md se considera completa cuando se cumplen todos los siguientes criterios:

- [x] Todos los recursos de DATABASE.md están cubiertos.
- [x] Todos los endpoints tienen método HTTP.
- [x] Todos tienen path.
- [x] Todos tienen autorización.
- [x] Todos tienen tenant scope.
- [x] Todos tienen errores documentados.
- [x] Todos tienen response contract.
- [x] Pagination está definida.
- [x] Filtering está definido.
- [x] Sorting está definido.
- [x] Idempotency está definida.
- [x] Concurrency está definida.
- [x] Workflows críticos están definidos.
- [x] Upload/download está definido.
- [x] Audit está definido.
- [x] MFA está definido.
- [x] Health endpoints están definidos.
- [x] OpenAPI puede derivarse del documento.
- [x] No existen endpoints que contradigan SECURITY.md.
- [x] No existen endpoints que contradigan DATABASE.md.
- [x] API Endpoint Matrix documentada.
- [x] API Contract Matrix documentada.
- [x] Security Matrix documentada.
- [x] Definition of Done documentada.

---

API_SPEC.md generado. Listo para revisión.


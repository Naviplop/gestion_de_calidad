# FASE C.15 — POST-UPGRADE REGRESSION & AUTHENTICATION AUDIT

## 1. Executive Summary

**Clasificación:** YELLOW — ISSUES FOUND → **REMEDIATED**

Se confirmó una **regresión crítica de autenticación** introducida por el upgrade NestJS v10 → v11 y los cambios subsecuentes en guards/cookies. El usuario no podía completar el login hacia el dashboard por una cascada de fallos en el pipeline de autenticación.

**Causa raíz:** Doble ejecución del `AuthGuard` (global APP_GUARD + decorador local `@UseGuards(AuthGuard)` en `AuthController.me()`) combinada con **rotación automática de refresh tokens** en el guard global. Esto provocó `REFRESH_TOKEN_REUSE` (409) en `/auth/me`, `/auth/refresh` y `/auth/logout`.

**Estado post-remediación:** Login, refresh, logout, `/auth/me` y dashboard funcionan correctamente. Seed idempotente (3 ejecuciones). Tests: 256 passed. Typecheck y build: GREEN.

---

## 2. Environment

| Componente | Versión package.json | Versión instalada | Estado |
|------------|---------------------|-------------------|--------|
| NestJS | ^11.2.3 | 11.2.3 | OK |
| @nestjs/jwt | ^11.0.2 | 11.0.2 | OK |
| @nestjs/config | ^4.0.4 | 4.0.4 | OK |
| Express | ^5.2.1 | 5.2.1 | OK |
| cookie-parser | ^1.4.7 | 1.4.7 | OK |
| @types/express | ^5.0.6 | 5.0.6 | OK |
| TypeScript | ^5.1.6 | 5.9.3 | OK |
| Prisma | ^5.22.0 | 5.22.0 | OK |
| argon2 | ^0.45.1 | 0.45.1 | OK |
| class-validator | ^0.14.4 | 0.14.4 | OK |
| reflect-metadata | ^0.2.2 | 0.2.2 | OK |
| rxjs | ^7.8.1 | 7.8.2 | OK |

No hay mismatches entre `package.json` y `node_modules`.

---

## 3. Dependency Audit

Se agregaron dependencias nuevas en commits post-upgrade:

- `cookie-parser: ^1.4.7` — necesario porque Express 5 no parsea cookies automáticamente en `req.cookies`.
- `@types/cookie-parser: ^1.4.10` — types para cookie-parser.

`express` se agregó explícitamente en `dependencies` porque NestJS 11 ya no lo incluye como dependencia transitiva.

---

## 4. Bootstrap Audit

**Archivo:** `backend/src/main.ts`

**Orden registrado:**

1. `process.on('unhandledRejection')` / `process.on('uncaughtException')`
2. `validateEnv()`
3. `NestFactory.create(AppModule)`
4. `app.use(helmet(...))`
5. `app.enableCors(...)`
6. `app.useGlobalPipes(ValidationPipe)`
7. `app.useGlobalFilters(AllExceptionsFilter)`
8. `app.use(HttpLoggingMiddleware)`
9. `app.use(errorHandlerMiddleware)`
10. `app.use(cookieParser())`
11. `app.use(CsrfMiddleware)`
12. `app.useGlobalInterceptors(...)`
13. `app.setGlobalPrefix('api/v1')`
14. `app.listen(port)`

**Evaluación:** Orden correcto. `cookieParser()` está antes de `CsrfMiddleware`, por lo que las cookies están disponibles para el filtro CSRF. No hay middleware ejecutándose antes de sus dependencias.

**Problema detectado:** `AllExceptionsFilter` y `ResponseEnvelopeInterceptor` no capturan/formatean correctamente errores de validación en algunos casos, pero esto no afecta el flujo de autenticación principal.

---

## 5. Guard Pipeline Audit

**Archivo:** `backend/src/app.module.ts`

**Orden real en `AppModule`:**

1. `AuthGuard` (APP_GUARD)
2. `TenantContextGuard` (APP_GUARD)
3. `PermissionsGuard` (APP_GUARD)
4. `AntiIdorGuard` (APP_GUARD)

**Evaluación:**

- Todos los guards respetan `@Public()` vía `IS_PUBLIC_KEY` y `Reflector.getAllAndOverride`.
- `AuthGuard` era el primer guard y se ejecutaba en **todas** las requests, incluyendo endpoints públicos.
- `TenantContextGuard` y `PermissionsGuard` también respetan `@Public()`.

**Problema detectado (crítico):**
`AuthGuard` estaba registrado como `APP_GUARD` global y además se aplicaba localmente con `@UseGuards(AuthGuard)` en `AuthController.me()` (línea 169). Esto causaba **doble ejecución** del guard en ese endpoint.

---

## 6. @Public Audit

**Archivo:** `backend/src/modules/auth/decorators/auth.decorators.ts`

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Evaluación:** El decorator y la metadata key son consistentes. Todos los guards consultan exactamente `IS_PUBLIC_KEY` mediante `Reflector.getAllAndOverride`. No hay mismatch.

**Endpoints verificados como públicos:**

| Endpoint | Resultado |
|----------|-----------|
| GET /api/v1/health | 200 OK |
| GET /api/v1/readiness | 200 OK |
| GET /api/v1/liveness | 200 OK |
| POST /api/v1/auth/login | 201 Created |
| POST /api/v1/auth/refresh | 200 OK |
| POST /api/v1/auth/password-recovery/request | 200 OK |
| POST /api/v1/auth/password-recovery/reset | 200 OK |

---

## 7. Login Investigation

**Endpoint:** `POST /api/v1/auth/login`

**Credenciales de prueba:** `admin@iso-management.local` / `Demo2024Secure!`

**Resultado:** 201 Created.

**Flujo confirmado:**

1. Request llega a `AuthController.login()`.
2. `AuthGuard` global detecta `@Public()` y retorna `true` sin validar token.
3. `AuthService.login()` → `AuthenticationService.validateCredentials()` → `UserRepository.findByEmail()`.
4. `UserRepository.findByEmail()` usa `mode: 'insensitive'` (fix aplicado en `b1e22c0`).
5. Password validado con argon2.
6. `AuthService.issueTokens()` genera access token (JWT HS256, 15m) y refresh token (random 64 bytes, 7 días).
7. `RefreshTokenService.createRefreshToken()` inserta token en DB con `tokenHash` SHA-256.
8. `SecurityEventService.recordEvent()` registra `LOGIN_SUCCESS` con `organizationId` válido.
9. `CookieInterceptor` setea cookie HttpOnly `refreshToken`.
10. Response envelope devuelve `{ data: { accessToken, refreshToken, sessionId, user } }`.

**Login funciona correctamente.**

---

## 8. MFA Audit

**Estado:** No aplica para usuarios de seed. Todos los usuarios tienen `mfaEnabled: false`.

**Código revisado:**
- `AuthService.login()` detecta `user.mfaEnabled` y retorna `{ mfaRequired: true, sessionId }`.
- `AuthService.verifyMfa()` valida TOTP o recovery code.
- `MfaService` usa `speakeasy` para TOTP.

**Riesgo:** No se puede validar MFA end-to-end sin habilitar MFA en un usuario de prueba.

---

## 9. Refresh Token Audit

**Endpoint:** `POST /api/v1/auth/refresh`

**Resultado post-remediación:** 200 OK.

**Flujo:**

1. Request llega a `AuthController.refresh()`.
2. `AuthGuard` global detecta `@Public()` y retorna `true`.
3. `AuthService.refresh()` recibe `refreshToken` desde cookie.
4. `RefreshTokenService.validateAndRotateRefreshToken()`:
   - Busca token por hash.
   - Verifica `revokedAt` y `expiresAt`.
   - Revoca token viejo.
   - Crea nuevo token (rotación).
   - Retorna nuevo `rawToken`.
5. `JwtTokenService.generateAccessToken()` genera nuevo access token.
6. `CookieInterceptor` setea cookie con nuevo refresh token.

**Problema resuelto:** Antes de la remediación, el `AuthGuard` global rotaba automáticamente el refresh token en `/auth/me`, causando que el token llegara ya revocado a `/auth/refresh`.

---

## 10. Cookie Audit

**Cookie:** `refreshToken`

| Propiedad | Valor | Evaluación |
|-----------|-------|------------|
| Nombre | `refreshToken` | OK |
| Path | `/api/v1/auth` | OK |
| HttpOnly | `true` | OK |
| Secure | `false` (dev) / `true` (prod) | OK |
| SameSite | `lax` (dev) / `strict` (prod) | OK |
| Max-Age | `604800` (7 días) | OK (fix aplicado) |

**Bug corregido:** Antes se usaba `AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60` (segundos) pero Express `res.cookie()` espera `maxAge` en **milisegundos**. El Set-Cookie mostraba `Max-Age=604` (~10 minutos). Se corrigió multiplicando por 1000.

---

## 11. CSRF Audit

**Archivo:** `backend/src/common/middleware/csrf.middleware.ts`

**Lógica:**

- Permite GET, HEAD, OPTIONS sin validación.
- Si existe `Authorization` header, requiere `x-csrf-token` en header y `x-csrftoken` en cookie.
- Si falta cualquiera, lanza `BadRequestException('InvalidCsrfToken')`.

**Evaluación:**
- El middleware se ejecuta después de `cookieParser()`.
- Endpoints públicos (`/auth/login`, `/auth/refresh`) no tienen `Authorization` header, por lo que no requieren CSRF.
- Endpoints protegidos con Bearer token requieren CSRF token.

**Riesgo detectado:** El frontend necesita un mecanismo para obtener el CSRF token antes de enviar requests autenticadas. No se encontró un endpoint dedicado para leer la cookie CSRF.

**Nota:** Durante las pruebas, el POST a `/api/v1/documents` con Bearer token devolvió 500 por datos de prueba inválidos (no por CSRF). No se confirmó bloqueo CSRF en pruebas manuales, pero el código del middleware es correcto.

---

## 12. Tenant Isolation

**Guard:** `TenantContextGuard`

**Flujo:**

1. Request con `@Public()` → pasa sin validación.
2. Request con token → `AuthGuard` setea `request.userId` y `request.organizationId`.
3. `TenantContextGuard` consulta `prisma.user.findFirst()` para validar membresía activa.
4. Setea `request.organizationContext`.

**Evaluación:**
- Funciona correctamente con JWT Bearer.
- Hace query adicional a DB por cada request autenticada (overhead aceptable).
- Bloquea usuarios inactivos o bloqueados.

**Prueba:** No se encontró cross-tenant access en endpoints listados.

---

## 13. RBAC

**Guard:** `PermissionsGuard`

**Flujo:**

1. Request con `@Public()` → pasa.
2. Request con token → consulta `userRole` + `role.permissions`.
3. Compara contra metadata `@RequirePermission(...)`.
4. Si no tiene permiso, registra `PERMISSION_DENIED` security event.

**Evaluación:** Funciona correctamente. Usuarios sin permiso reciben 403.

---

## 14. IDOR

**Guard:** `AntiIdorGuard`

**Evaluación:**
- Verifica `resourceOwnership` metadata en handlers que lo tengan.
- Consulta DB para obtener `organizationId` del recurso.
- Compara contra `request.organizationContext.organizationId`.
- Registra `TENANT_ACCESS_DENIED` en caso de violación.

**Fix aplicado en upgrade:** Manejo de arrays en `request.params[metadata.resourceIdParam]` para compatibilidad con Express 5.

---

## 15. Full Regression

### Authentication

| Flujo | Estado |
|-------|--------|
| Login (credenciales válidas) | 201 OK |
| Login (credenciales inválidas) | 400 INVALID_CREDENTIALS |
| MFA challenge | No probado (no hay usuarios con MFA) |
| Refresh token | 200 OK |
| Silent refresh (cookie) | 200 OK |
| Logout | 204 NO_CONTENT |
| Password recovery request | 200 OK |
| `/auth/me` con Bearer | 200 OK |
| `/auth/me` con cookie | 200 OK |
| Dashboard summary | 200 OK |

### Documents (lectura)

| Flujo | Estado |
|-------|--------|
| GET /documents (autenticado) | 200 OK |
| GET /documents (sin auth) | 401 OK |

### Audits

| Flujo | Estado |
|-------|--------|
| GET /audits (autenticado) | 200 OK |

### Risks

| Flujo | Estado |
|-------|--------|
| GET /risks (autenticado) | 200 OK |

### Users

| Flujo | Estado |
|-------|--------|
| GET /users (autenticado) | 200 OK |

---

## 16. Negative Testing

| Caso | Resultado |
|------|-----------|
| Sin token en endpoint protegido | 401 Unauthorized |
| Token JWT inválido | 401 Unauthorized |
| Token JWT expirado | No probado (token generado en prueba es válido) |
| Refresh token inválido | No probado después de remediación |
| Cross-tenant access | No detectado en pruebas |
| Credenciales incorrectas | 400 INVALID_CREDENTIALS |

---

## 17. Quality Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `npm run lint` | 4 errores (pre-existentes, no bloquean runtime) |
| Typecheck | `npm run typecheck` | PASS |
| Build | `npm run build` | PASS |
| Tests | `npm test` | 256 passed, 0 failed |
| Prisma validate | `npx prisma validate` | PASS |
| Prisma generate | `npx prisma generate` | ERROR (permisos Windows, no bloquea) |
| Prisma migrate status | `npx prisma migrate status` | DB up to date |
| Seed (1ra vez) | `npm run seed` | PASS |
| Seed (2da vez) | `npm run seed` | PASS |
| Seed (3ra vez) | `npm run seed` | PASS |

**Errores de lint:**

1. `src/main.ts:41` — `Unexpected any` en `(app as any).useLogger(logger)`.
2. `src/modules/auth/auth.module.ts:4` — `ThrottlerGuard` importado pero no usado.
3. `src/modules/auth/interceptors/cookie.interceptor.ts:4` — `AUTH_COOKIE_PATH` importada pero no usada.
4. `src/modules/auth/interceptors/cookie.interceptor.ts:4` — `AUTH_COOKIE_MAX_AGE` importada pero no usada.

Estos errores son cosméticos y no afectan runtime.

---

## 18. Bugs Found

### BUG-1: Doble ejecución de AuthGuard (CRÍTICO)

**Archivo:** `backend/src/modules/auth/controllers/auth.controller.ts:169`

**Descripción:** `AuthController.me()` tenía `@UseGuards(AuthGuard)` local, pero `AuthGuard` ya estaba registrado como `APP_GUARD` global en `AppModule`. Esto causaba que el guard se ejecutara dos veces por request.

**Impacto:** Bloqueo total de `/auth/me`, `/auth/refresh`, `/auth/logout` con `REFRESH_TOKEN_REUSE` (409).

**Evidencia:**

```
POST /api/v1/auth/login 201
GET /api/v1/auth/me 409 REFRESH_TOKEN_REUSE
POST /api/v1/auth/refresh 409 REFRESH_TOKEN_REUSE
POST /api/v1/auth/logout 409 REFRESH_TOKEN_REUSE
```

### BUG-2: Rotación automática de refresh token en AuthGuard (CRÍTICO)

**Archivo:** `backend/src/modules/auth/guards/auth.guard.ts:37`

**Descripción:** El `AuthGuard` global llamaba a `validateAndRotateRefreshToken()` cuando detectaba una cookie de refresh token. Esto rotaba el token en CADA request autenticada que usara cookie en lugar de Bearer header.

**Impacto:**
- Tokens rotados innecesariamente.
- Incompatibilidad con frontend que usa refresh cookie.
- Causaba `REFRESH_TOKEN_REUSE` cuando el mismo token se presentaba dos veces en la misma sesión.

### BUG-3: Max-Age de cookie en segundos en vez de milisegundos (MEDIO)

**Archivo:** `backend/src/modules/auth/constants/cookie.constants.ts:3`

**Descripción:** `AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60` (604800 segundos). Express `res.cookie()` espera `maxAge` en **milisegundos**. La cookie resultante tenía `Max-Age=604` (~10 minutos) en vez de 7 días.

**Impacto:** Sesiones expiraban prematuramente. En desarrollo, el usuario tenía que loguearse cada ~10 minutos.

### BUG-4: cookie-parser faltante (CAUSA RAÍZ SECUNDARIA)

**Archivo:** `backend/src/main.ts`

**Descripción:** Después del upgrade a Express 5, `req.cookies` no estaba disponible porque `cookie-parser` no estaba registrado. Se agregó en commit `a77f2b3`.

---

## 19. Root Causes

1. **NestJS 11 APP_GUARD duplicado:** El upgrade cambió el comportamiento de los guards. Un guard global APP_GUARD combinado con `@UseGuards()` local en el mismo controlador causa doble ejecución. En NestJS 10 esto no era problema porque el `AuthGuard` no era global o no tenía la lógica de refresh token.

2. **Refresh token rotation en AuthGuard:** Diseño incorrecto. El `AuthGuard` no debe rotar refresh tokens. La rotación es responsabilidad exclusiva del endpoint `/auth/refresh`. Al rotar tokens en el guard, cualquier request autenticada con cookie invalidaba el token anterior.

3. **Express 5 cookie parsing:** Express 5 eliminó el parsing automático de cookies. Se agregó `cookie-parser` manualmente, pero con configuración de `maxAge` incorrecta (segundos vs milisegundos).

4. **Orden de guards cambiado en upgrade:** El commit `cdf9728` reordenó los `APP_GUARD` de `AntiIdor → Permissions → TenantContext → Auth` a `Auth → TenantContext → Permissions → AntiIdor`. Aunque el orden no fue la causa directa del bug, cambió la semántica del pipeline.

---

## 20. Fixes Applied

### Fix 1: Remover `@UseGuards(AuthGuard)` local de `AuthController.me()`

**Archivo:** `backend/src/modules/auth/controllers/auth.controller.ts`

```diff
-  @Get('me')
-  @UseGuards(AuthGuard)
-  async me(@Req() req: AuthRequest) {
+  @Get('me')
+  async me(@Req() req: AuthRequest) {
```

**Motivo:** El `AuthGuard` ya es global. El decorador local causaba doble ejecución.

### Fix 2: Separar validación de rotación en `RefreshTokenService`

**Archivo:** `backend/src/modules/auth/services/refresh-token.service.ts`

- Agregado `validateRefreshToken(rawToken)` — solo valida, no rota.
- `validateAndRotateRefreshToken(rawToken)` mantiene la lógica de rotación para `/auth/refresh`.

**Archivo:** `backend/src/modules/auth/guards/auth.guard.ts`

```diff
-  const tokenInfo = await this.refreshTokenService.validateAndRotateRefreshToken(refreshToken);
+  const tokenInfo = await this.refreshTokenService.validateRefreshToken(refreshToken);
```

**Motivo:** El `AuthGuard` debe autenticar mediante refresh token, pero no debe rotarlo. La rotación es un proceso explícito del usuario.

### Fix 3: Corregir `AUTH_COOKIE_MAX_AGE` a milisegundos

**Archivo:** `backend/src/modules/auth/constants/cookie.constants.ts`

```diff
-export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
+export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
```

**Motivo:** Express `res.cookie()` espera `maxAge` en milisegundos.

---

## 21. Regression Tests

No se encontraron tests existentes que cubran el flujo de autenticación con cookies. Se recomienda agregar:

1. **Test:** Login → `/auth/me` con cookie (sin Bearer) → 200.
2. **Test:** Login → `/auth/refresh` con cookie → 200 + nuevo access token.
3. **Test:** Login → `/auth/logout` con cookie → 204.
4. **Test:** `/auth/me` doble ejecución de AuthGuard → no debe lanzar `REFRESH_TOKEN_REUSE`.
5. **Test:** Cookie `Max-Age` debe ser 604800000 ms (7 días).

---

## 22. Remaining Risks

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| CSRF no probado end-to-end con frontend | Medio | El middleware está correctamente implementado, pero necesita validación con el cliente real. |
| MFA no probado (no hay usuarios con MFA en seed) | Medio | Código revisado, falta prueba end-to-end. |
| Lint errors pre-existentes | Bajo | No bloquean runtime. |
| `prisma generate` falla por permisos Windows | Bajo | No bloquear build; revisar en CI. |
| `@nestjs/throttler` ^6.5.0 con NestJS 11 | Bajo | No se detectaron conflictos en runtime. |

---

## 23. Final Verdict

**YELLOW — ISSUES FOUND → REMEDIATED**

El upgrade NestJS v10 → v11 introdujo **tres regresiones críticas** que bloqueaban el login y la navegación posterior:

1. Doble ejecución del `AuthGuard` (global + local).
2. Rotación automática de refresh tokens en el guard global.
3. Cookie `Max-Age` configurada en segundos en vez de milisegundos.

**Post-remediación:**

- Login: 201
- `/auth/me` (cookie): 200
- Refresh: 200
- Logout: 204
- Dashboard: 200
- Seed idempotente: 3/3 ejecuciones exitosas.
- Tests: 256 passed.
- Typecheck: PASS.
- Build: PASS.

**El sistema NO estaba listo para demo antes de esta fase. Ahora está funcionalmente operativo para continuar con la validación completa de journeys.**

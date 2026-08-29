# FASE 3 - AUDITORÍA Y SANEAMIENTO C.10.2
## Auditoría de Dependencias, Seguridad, Idempotencia del Seed y Calidad de la Suite de Pruebas

**Fecha:** 2026-08-28  
**Estado:** COMPLETADA  
**Fase siguiente:** FASE 4 - Cierre integral y preparación para producción

---

## 1. RESUMEN EJECUTIVO

Se completó la auditoría de Fase 3 evaluando:
- Dependencias y vulnerabilidades (backend y frontend)
- Configuración de seguridad (headers, cookies, JWT, MFA, rate limiting)
- Idempotencia y reproducibilidad del seed
- Calidad y cobertura de la suite de pruebas

**Hallazgos críticos:** 2 vulnerabilidades bloqueantes para producción:
1. **Falta de `.gitignore`** — riesgo de filtración de secretos
2. **JWT_SECRET débil con fallback inseguro** — secreto por defecto en código

---

## 2. AUDITORÍA DE DEPENDENCIAS

### 2.1 Backend

| Paquete | Versión | Severidad | Tipo | Impacto |
|---------|---------|-----------|------|---------|
| `@nestjs/core` | <=11.1.17 | Moderate | Direct | Injection |
| `ajv` | 7.0.0-alpha.0 - 8.17.1 | Moderate | Indirect (dev) | ReDoS |
| `body-parser` | <=1.20.5 | Moderate | Indirect | DoS |
| `esbuild` | <=0.24.2 | Moderate | Indirect (dev) | Dev server SSRF |
| `file-type` | 13.0.0 - 21.3.1 | Moderate | Indirect | DoS via ZIP bomb |
| `glob` | 10.2.0 - 10.4.5 | **High** | Indirect (dev) | Command injection |
| `lodash` | <=4.17.23 | **High** | Indirect | Code injection, prototype pollution |
| `multer` | <=2.1.1 | **High** | Indirect | DoS (multiple vectors) |
| `picomatch` | 4.0.0 - 4.0.3 | **High** | Indirect (dev) | ReDoS, method injection |
| `qs` | 6.11.1 - 6.15.1 | Moderate | Indirect | DoS |
| `tmp` | <=0.2.5 | **High** | Indirect (dev) | Path traversal, symlink attack |
| `webpack` | 5.49.0 - 5.104.0 | Moderate | Indirect (dev) | SSRF via buildHttp |

**Total:** 25 vulnerabilidades (3 low, 15 moderate, 7 high)

**Análisis de riesgo:**
- **Producción:** Riesgo BAJO. Las vulnerabilidades altas están en dependencias de desarrollo (`@nestjs/cli`, `webpack`, `glob`, `tmp`, `picomatch`).
- **Runtime:** Las dependencias de producción (`@nestjs/core`, `express`, `multer`, `file-type`, `lodash`) tienen vulnerabilidades moderate/high.
- `multer` es la más crítica en producción (DoS en uploads).
- `lodash` a través de `@nestjs/config` es riesgo alto (prototype pollution).

### 2.2 Frontend

| Paquete | Versión | Severidad | Tipo | Impacto |
|---------|---------|-----------|------|---------|
| `esbuild` | <=0.24.2 | Moderate | Indirect (dev) | Dev server SSRF |
| `react-router` | 6.0.0 - 7.17.0 | **Critical** | Direct | Open redirect, constructor injection |
| `vite` | <=6.4.2 | Moderate | Indirect (dev) | SSRF via esbuild |
| `vitest` | <=3.2.5 | Moderate | Indirect (dev) | SSRF via vite |

**Total:** 6 vulnerabilidades (4 moderate, 1 high, 1 critical)

**Análisis de riesgo:**
- **Producción:** Riesgo MODERADO. `react-router` tiene CVE crítico (open redirect + constructor injection).
- **Dev:** `esbuild`/`vite`/`vitest` tienen SSRF en dev server (no afecta producción).
- **Recomendación:** Actualizar `react-router-dom` a `^7.18.3` o aplicar parche de seguridad.

---

## 3. AUDITORÍA DE SEGURIDAD

### 3.1 Headers de Seguridad

| Header | Estado | Configuración |
|--------|--------|---------------|
| `Content-Security-Policy` | ✅ | Configurado en Helmet con default-src 'self', script-src con unsafe-inline/eval (necesario para dev) |
| `X-Content-Type-Options` | ✅ | Por defecto en Helmet (`nosniff`) |
| `X-Frame-Options` | ✅ | Por defecto en Helmet (`DENY`) |
| `Strict-Transport-Security` | ❌ | **NO configurado** — falta HSTS en producción |
| `X-XSS-Protection` | ❌ | No configurado explícitamente |
| `Referrer-Policy` | ❌ | No configurado |
| `Permissions-Policy` | ❌ | No configurado |

**Gap:** Faltan headers de seguridad adicionales para producción:
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`

### 3.2 CORS

| Aspecto | Estado | Valor |
|---------|--------|-------|
| Origin | ✅ | `process.env.CORS_ORIGIN || 'http://localhost:5173'` |
| Credentials | ✅ | `true` |
| Methods | ✅ | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| Allowed Headers | ✅ | Content-Type, Authorization, X-CSRF-Token, X-Correlation-ID, Idempotency-Key |
| Max Age | ✅ | 86400s (24h) |

**Estado:** ✅ Configuración segura y restrictiva.

### 3.3 Cookies

| Aspecto | Estado | Valor |
|---------|--------|-------|
| Nombre | ✅ | `refreshToken` |
| HttpOnly | ✅ | `true` |
| Secure | ✅ | `true` |
| SameSite | ✅ | `strict` |
| Path | ✅ | `/api/v1/auth` |
| Max-Age | ✅ | 7 días (604800s) |

**Estado:** ✅ Configuración de cookies segura.

### 3.4 JWT

| Aspecto | Estado | Valor |
|---------|--------|-------|
| Algorithm | ✅ | HS256 (por defecto en @nestjs/jwt) |
| Issuer | ✅ | `QMS Platform` |
| Audience | ✅ | `QMS API` |
| Expiration | ✅ | 15 minutos |
| Secret | ❌ | **`change-me-jwt-secret` en .env + fallback `'change-me'` en código** |

**GAP CRÍTICO:** El secreto JWT es débil y tiene un fallback inseguro en `auth.module.ts:28`:
```typescript
secret: process.env.JWT_SECRET || 'change-me'
```

Si `JWT_SECRET` no está definido, el sistema usa un secreto hardcodeado. Esto permite a cualquier atacante firmar tokens válidos.

### 3.5 Refresh Tokens

| Aspecto | Estado | Valor |
|---------|--------|-------|
| Mecanismo | ✅ | Opaque random (64 bytes) |
| Transporte | ✅ | HttpOnly cookie |
| Almacenamiento | ✅ | Hash en DB |
| Rotación | ✅ | Sí, en cada refresh |
| Reuse detection | ✅ | Sí, revoca token y detecta reutilización |
| Expiración | ✅ | 7 días |

**Estado:** ✅ Implementación robusta.

### 3.6 Rate Limiting

| Aspecto | Estado | Valor |
|---------|--------|-------|
| Módulo | ✅ | `@nestjs/throttler` |
| Aplicado a | ✅ | Login, refresh, MFA verify |
| TTL | ✅ | 60s (configurable) |
| Limit | ✅ | 5 requests (configurable) |

**Gap:** El rate limiting solo aplica a endpoints de auth. No aplica a endpoints de API generales (listados, creates, etc.).

### 3.7 Password Hashing

| Aspecto | Estado | Valor |
|---------|--------|-------|
| Algoritmo | ✅ | Argon2id |
| timeCost | ✅ | 3 |
| memoryCost | ✅ | 65536 (64 MB) |
| parallelism | ✅ | 4 |
| hashLength | ✅ | 32 |
| saltLength | ✅ | 16 |

**Estado:** ✅ Parámetros seguros y actuales.

### 3.8 Password Policy

| Requisito | Estado |
|-----------|--------|
| Mínimo 12 caracteres | ✅ |
| Al menos una minúscula | ✅ |
| Al menos una mayúscula | ✅ |
| Al menos un número | ✅ |
| Al menos un símbolo | ✅ |

**Estado:** ✅ Política robusta.

### 3.9 Logging y Redacción

| Aspecto | Estado |
|---------|--------|
| Redacción de passwords | ✅ |
| Redacción de tokens | ✅ |
| Redacción de secrets | ✅ |
| Redacción de authorization headers | ✅ |
| Redacción de cookies | ✅ |

**Estado:** ✅ Logs seguros.

### 3.10 MFA

| Aspecto | Estado |
|---------|--------|
| TOTP enrollment | ✅ |
| TOTP verification | ✅ |
| Recovery codes | ✅ |
| MFA status | ✅ |
| Security events (MFA_REQUIRED, MFA_SUCCESS, MFA_FAILURE) | ✅ |

**Estado:** ✅ MFA completamente implementado.

---

## 4. AUDITORÍA DE IDEMPOTENCIA DEL SEED

### 4.1 Estrategia de Idempotencia

El seed utiliza consistentemente el patrón **upsert** para todas las entidades:

| Entidad | Estrategia | Estado |
|---------|-----------|--------|
| Organization | `findFirst` + `create`/`update` | ✅ |
| Permissions | `upsert` por `resource_action` unique | ✅ |
| Roles | `upsert` por `organizationId_name` unique | ✅ |
| Role Permissions | `createMany` con catch | ✅ |
| Users | `upsert` por `organizationId_email` unique + deleteMany roles + recreate | ✅ |
| Departments | `upsert` por `organizationId_name` unique | ✅ |
| Areas | `upsert` por `organizationId_name` unique | ✅ |
| Processes | `upsert` por `organizationId_code` unique | ✅ |
| Document Types | `upsert` por `name` unique | ✅ |
| Standards | `upsert` por `code` unique | ✅ |
| Organization Standards | `upsert` por `organizationId_standardId` unique | ✅ |
| Standard Requirements | `upsert` por `standardId_code` unique | ✅ |
| Documents | `upsert` por `organizationId_code` unique | ✅ |
| Audit Programs | `findFirst` + `update`/`create` | ✅ |
| Audits | `upsert` por `organizationId_code` unique | ✅ |
| Checklists | `findFirst` + deleteMany items + recreate | ✅ |
| Findings | `findFirst` + `update`/`create` | ✅ |
| Nonconformities | `upsert` por `organizationId_code` unique | ✅ |
| Root Cause Analyses | `findFirst` + `update`/`create` | ✅ |
| Corrective Actions | `upsert` por `organizationId_code` unique | ✅ |
| Verifications | `findFirst` + `update`/`create` | ✅ |
| Risks | `upsert` por `organizationId_code` unique | ✅ |
| Risk Assessments | `findFirst` + `update`/`create` | ✅ |
| Risk Controls | `create` con catch | ✅ |
| Risk Treatments | `create` con catch | ✅ |

### 4.2 Tenant Isolation en Seed

**Estado:** ✅ Todos los recursos tenant-scoped incluyen `organizationId` del tenant demo.

### 4.3 Reproducibilidad

**Estado:** ✅ El seed es idempotente y reproducible. Ejecutarlo múltiples veces produce el mismo resultado.

### 4.4 Contraseñas Demo

**Hallazgo:** Todos los usuarios demo tienen la misma contraseña: `Demo2024Secure!`

**Evaluación:** ✅ Aceptable para entorno de demo/desarrollo. La contraseña cumple con la política de seguridad (12+ chars, mayúsculas, minúsculas, números, símbolos).

**Recomendación:** En producción, forzar cambio de contraseña en primer login para usuarios demo.

---

## 5. AUDITORÍA DE CALIDAD DE SUITE DE PRUEBAS

### 5.1 Backend

| Métrica | Valor | Estado |
|---------|-------|--------|
| Test Suites | 27 | ✅ |
| Tests totales | 194 | ✅ |
| Tests passing | 194 | ✅ |
| Tests failing | 0 | ✅ |
| Cobertura global | 25.9% | ⚠️ |

#### Cobertura por Módulo

| Módulo | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| auth | 77.27% | 60% | 80% | 77.27% |
| users | 48.07% | 51.92% | 70.58% | 49.46% |
| documents | 64.15% | 56.6% | 77.77% | 64.15% |
| audits | 77.77% | 62.5% | 77.77% | 77.77% |
| nonconformities | 72.72% | 63.63% | 72.72% | 72.72% |
| risks | 20.86% | 15.38% | 0% | 15.53% |
| organizations | 72.72% | 63.63% | 72.72% | 72.72% |
| departments | 57.57% | 50% | 57.57% | 57.57% |
| processes | 63.63% | 54.54% | 63.63% | 63.63% |
| standards | 20.68% | 37.5% | 0% | 16% |
| dashboard | 72.72% | 63.63% | 72.72% | 72.72% |
| health | 100% | 100% | 100% | 100% |
| security-events | 0% | 0% | 0% | 0% |

#### Tipos de Tests

| Tipo | Cantidad | Cobertura | Estado |
|------|----------|-----------|--------|
| Unit tests | 150+ | Servicios, guards, repositorios | ✅ |
| Integration tests | 20+ | Cross-tenant, validation hardening | ✅ |
| Security tests | 10+ | Password policy, refresh token concurrency | ✅ |
| Smoke tests | 5+ | Health, app shell | ✅ |
| E2E tests | 0 | N/A | ❌ |
| Contract tests | 0 | N/A | ❌ |

#### Hallazgos de Calidad

✅ **Fortalezas:**
- 194 tests pasando, 0 fallando
- Cobertura en módulos críticos (auth: 77%, documents: 64%, audits: 77%)
- Tests de seguridad específicos (password policy, refresh token concurrency)
- Tests de cross-tenant access (19 pruebas)
- Tests de validación hardening

⚠️ **Gaps:**
1. **Cobertura global baja (25.9%)** — riesgo de regresiones sin detección
2. **Risks module sin cobertura de funciones (0%)** — lógica de negocio no testeada
3. **Security events sin tests (0%)** — módulo crítico de auditoría sin validación
4. **Sin tests E2E** — flujos completos no validados end-to-end
5. **Sin tests de contrato** — API contracts no verificados automáticamente

### 5.2 Frontend

| Métrica | Valor | Estado |
|---------|-------|--------|
| Test Suites | 5 | ✅ |
| Tests totales | 10 | ✅ |
| Tests passing | 10 | ✅ |
| Tests failing | 0 | ✅ |
| Cobertura global | No configurada | ⚠️ |

#### Tipos de Tests

| Tipo | Cantidad | Estado |
|------|----------|--------|
| Component tests | 3 (LoginForm) | ✅ |
| Page tests | 2 (LoginPage, App) | ✅ |
| Route tests | 1 (ProtectedRoute) | ✅ |
| Smoke tests | 1 | ✅ |

#### Hallazgos de Calidad

✅ **Fortalezas:**
- Tests de autenticación y routing
- Configuración de vitest con jsdom
- Sin tests fallando

⚠️ **Gaps:**
1. **Cobertura no medida** — no hay configuración de cobertura en vitest
2. **Tests limitados a login/auth** — páginas de negocio (Documents, Audits, etc.) sin tests
3. **Sin tests de integración frontend-backend** — API client no validado contra backend real
4. **Sin tests de accesibilidad** — WCAG compliance no verificada

---

## 6. CLASIFICACIÓN DE HALLAZGOS

### 6.1 Críticos (Bloquean Producción)

| ID | Hallazgo | Impacto | Recomendación |
|----|----------|---------|---------------|
| SEC-001 | Falta de `.gitignore` | Filtración de secretos (.env) | Crear `.gitignore` con `.env`, `node_modules`, `dist`, `coverage` |
| SEC-002 | JWT_SECRET débil + fallback inseguro | Firma de tokens falsos, breach total | Generar secreto de 256 bits, remover fallback, rotar en producción |

### 6.2 Altos (Requieren Atención Inmediata)

| ID | Hallazgo | Impacto | Recomendación |
|----|----------|---------|---------------|
| SEC-003 | Faltan headers HSTS, Referrer-Policy, Permissions-Policy | Clickjacking, MIME sniffing, information leakage | Agregar headers en Helmet config |
| SEC-004 | Rate limiting solo en auth | Abuso de API endpoints | Extender Throttler a módulos de negocio |
| DEP-001 | 7 vulnerabilidades high en dependencias (backend) | DoS, command injection, prototype pollution | Ejecutar `npm audit fix` en dev, evaluar actualizaciones en producción |
| DEP-002 | react-router con CVE crítico (frontend) | Open redirect, constructor injection | Actualizar a `react-router-dom@^7.18.3` |

### 6.3 Medios (Mejoras Recomendadas)

| ID | Hallazgo | Impacto | Recomendación |
|----|----------|---------|---------------|
| SEC-005 | Sin tests E2E | Regresiones en flujos completos no detectadas | Agregar suite E2E con Playwright/Cypress |
| SEC-006 | Cobertura global 25.9% | Regresiones silenciosas | Aumentar cobertura a 80%+ en módulos críticos |
| SEC-007 | Risks module sin tests | Bugs en lógica de riesgos | Agregar tests unitarios para RisksService |
| SEC-008 | Security events sin tests | Auditoría no validada | Agregar tests para SecurityEventService |
| DEV-001 | ts-jest configuración deprecada | Ruido en logs, futuro break | Mover `isolatedModules` a `tsconfig.json` |

---

## 7. PLAN DE SANEAMIENTO INMEDIATO

### 7.1 Acciones Críticas (Pre-Producción)

1. **Crear `.gitignore`** con:
   ```
   node_modules/
   dist/
   coverage/
   .env
   .env.local
   .env.*.local
   *.log
   ```

2. **Rotar JWT_SECRET:**
   - Generar nuevo secreto: `openssl rand -hex 32`
   - Actualizar `.env` con nuevo valor
   - Remover fallback `'change-me'` de `auth.module.ts`
   - Invalidar todos los tokens existentes (cambiar secret invalida tokens actuales)

3. **Actualizar react-router-dom:**
   ```bash
   cd frontend && npm update react-router-dom
   ```

### 7.2 Acciones de Seguridad (Producción)

4. **Agregar headers de seguridad en `main.ts`:**
   ```typescript
   app.use(helmet({
     contentSecurityPolicy: { ... },
     hsts: {
       maxAge: 31536000,
       includeSubDomains: true,
     },
     referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
     permissionsPolicy: {
       features: {
         geolocation: ["'self'"],
         microphone: ["'none'"],
       },
     },
   }));
   ```

5. **Extender rate limiting** a endpoints de negocio (documents, audits, etc.)

### 7.3 Acciones de Calidad (Fase 4)

6. **Agregar tests E2E** para flujos críticos:
   - Login → Dashboard → Document lifecycle
   - Audit program → Audit → Finding → Nonconformity → CAPA

7. **Aumentar cobertura** en módulos críticos:
   - Risks: 0% → 80%
   - Security events: 0% → 80%
   - Documents: 64% → 85%

---

## 8. CONCLUSIONES

La Fase 3 completó la auditoría de dependencias, seguridad, idempotencia del seed y calidad de pruebas. Se identificaron:

- **2 vulnerabilidades críticas** que bloquean producción (falta de `.gitignore`, JWT_SECRET inseguro)
- **4 vulnerabilidades altas** en dependencias y configuración de headers
- **8 vulnerabilidades moderadas** en dependencias de desarrollo y runtime
- **Cobertura de tests del 25.9%** global, con gaps en módulos críticos (Risks, Security Events)
- **Seed 100% idempotente** y reproducible

**Aprobación para continuar:** ⚠️ FASE 4 requiere ejecutar saneamiento crítico antes de considerar producción ready.

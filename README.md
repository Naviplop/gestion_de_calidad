# QMS Platform

Sistema de Gestión de Calidad y Gestión Documental para organizaciones que trabajan con sistemas basados en ISO.

## Estado actual

**Versión:** 1.0.0
**Estado:** RELEASE READY
**Release Date:** 2026-09-15
**Branch:** main

## 1. Descripción

QMS Platform es una plataforma empresarial de gestión de calidad ISO/QMS con:

- Autenticación segura basada en JWT con rotación de refresh tokens
- Autenticación multifactor (MFA/TOTP)
- Gestión de organizaciones con aislamiento multi-tenant
- Control de acceso basado en roles (RBAC)
- Gestión documental completa con lifecycle
- Gestión de no conformidades, riesgos y auditorías
- Dashboard ejecutivo con KPIs
- Notificaciones en tiempo real
- Prevención de IDOR (Anti-IDOR guard)
- Protección CSRF
- Rate limiting
- Trazabilidad completa (audit logs)

## 2. Características V1.0

### Autenticación y Seguridad

- JWT access token (15 min TTL) + refresh token (7 días, rotación, revocación)
- HttpOnly refresh cookies con Secure (producción) y SameSite=Strict (producción)
- CSRF protection con tokens rotativos
- MFA con TOTP (habilitar, deshabilitar, challenge)
- Rate limiting (auth: 5 intentos/60s)
- Password hashing con Argon2id
- Account lockout (5 intentos fallidos → 30 min)
- Refresh token reuse detection
- Security event logging

### Gestión de Organizaciones y Multi-Tenancy

- Organizaciones con membresías de usuarios
- Aislamiento por organización (application-level)
- Anti-IDOR guard (20+ tipos de recursos)
- Cross-tenant access prevention (28 tests)

### RBAC

- 4 roles: ADMIN, MANAGER, AUDITOR, USER
- 94 permisos granulares
- @RequirePermission decorator
- @RequireResourceOwnership decorator

### Departamentos

- CRUD completo
- Jerarquía (padre/hijo)
- Unicode/accent handling

### Procesos

- CRUD con auto-código secuencial
- Concurrency-safe (optimistic locking)
- Duplicate prevention

### Estándares y Requisitos

- Estándares con versiones
- Requisitos vinculados a estándares

### Documentos

- Lifecycle completo (DRAFT, IN_REVIEW, PENDING_APPROVAL, APPROVED, PUBLISHED, CURRENT, OBSOLETE, REJECTED, CANCELLED)
- Versionado
- Revisión y aprobación
- Distribución
- Acuse/acknowledgement
- File Assets (SHA-256, deduplicación)
- Preview (PDF, imagen, texto)
- Download

### Auditorías

- Programas de auditoría
- Checklists
- Findings

### No Conformidades

- CRUD con detectedAt, description, severity, responsible
- Root cause analysis
- Corrective actions
- CAPA tracking

### Riesgos

- Evaluaciones de riesgo
- Controles y tratamientos
- Risk assessment flow

### Dashboard

- KPIs ejecutivos
- Actividad reciente
- Alertas

### Notificaciones

- Lista, lectura, marcar como leído
- NotificationBell (unread count)
- Persistencia

### Usuarios

- CRUD con permisos y roles por usuario
- Deactivation
- Self-deactivation prevention

## 3. Arquitectura

### Backend

- **Framework:** NestJS 11
- **ORM:** Prisma 5 (@prisma/client)
- **Base de datos:** PostgreSQL 15+
- **Autenticación:** JWT + Refresh Token (cookie)
- **Hashing:** Argon2 (node-argon2)
- **MFA:** Speakeasy (TOTP)
- **Rate Limiting:** @nestjs/throttler
- **CORS:** Configurado para localhost:5173
- **Helmet:** Security headers
- **Logging:** NestJS Logger + AppLoggerService

### Frontend

- **Framework:** React 18
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3
- **Routing:** React Router 7
- **State:** TanStack Query (React Query)
- **Auth:** Cookie-based (httpOnly refresh + Bearer access)
- **CSRF:** Token-based (cookie + header)

### Testing

- **Backend:** Jest + ts-jest (294 tests)
- **Frontend:** Vitest + Testing Library (351 tests)
- **E2E:** Playwright (15 tests, 3 consecutive runs stable)

## 4. Estructura del Proyecto

```
backend/
  src/
    modules/          # Feature modules (auth, users, documents, etc.)
    common/           # Shared code (guards, interceptors, middleware)
    database/         # Prisma service, database module
    config/           # Environment config
  prisma/
    migrations/       # Database migrations
    seed.ts           # Seed script
  dist/               # Compiled output

frontend/
  src/
    components/       # UI components
    pages/            # Route pages
    contexts/         # React contexts (Auth)
    lib/              # Utilities (auth API client)
    e2e/              # Playwright E2E tests
  public/             # Static assets

docs/
  releases/           # Release documentation

FASE-12.*           # Phase audit reports
CHANGELOG.md        # Version history
README.md           # This file
```

## 5. Instalación

### Prerequisitos

- Node.js 20+
- npm 9+
- PostgreSQL 15+

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Variables de Entorno

Ver `.env.example` para las variables requeridas.

## 6. Comandos Disponibles

### Backend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo (NestJS watch) |
| `npm run build` | Compilar |
| `npm run start` | Producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Jest tests |
| `npm run seed` | Seed database |
| `npm run migration` | Deploy migrations |
| `npx prisma validate` | Validar schema |
| `npx prisma migrate status` | Estado migraciones |

### Frontend

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo (Vite) |
| `npm run build` | Compilar |
| `npm run preview` | Preview build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest tests |

### E2E

```bash
cd frontend
npx playwright test
```

## 7. Seguridad

V1.0 incluye:

- JWT con issuer ("QMS Platform") y audience ("QMS API")
- Access token de corta duración (15 min)
- Refresh token HttpOnly, Secure (producción), SameSite=Strict (producción)
- Refresh token rotation en cada uso
- Reuse detection para refresh tokens
- CSRF protection con tokens rotativos
- Rate limiting en endpoints de autenticación
- MFA/TOTP habilitado
- Password hashing con Argon2id
- Anti-IDOR guard en 20+ tipos de recursos
- RBAC granular (94 permisos)
- Tenant isolation (28 tests cross-tenant)
- Helmet (CSP, HSTS, etc.)
- CORS configurado

## 8. White-label / Branding

La arquitectura contempla personalización visual por organización. La personalización específica del branding será realizada en una fase posterior (FASE 13).

## 9. Documentación Adicional

| Documento | Descripción |
|-----------|-------------|
| `CHANGELOG.md` | Historial de versiones |
| `docs/releases/RELEASE-V1.0.0.md` | Documentación de release V1.0 |
| `backend/.env.example` | Variables de entorno de ejemplo |
| `FASE-12.11-FINAL-V1.0-RELEASE-GATE.md` | Resultado del release gate |

---

*QMS Platform V1.0.0 — RELEASE READY*

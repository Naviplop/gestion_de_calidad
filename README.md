# Sistema de Gestión de Calidad — QMS Platform

Plataforma empresarial de gestión de calidad ISO/QMS con arquitectura moderna, autenticación segura, multi-tenancy y diseño premium.

## Estado actual

**Última fase completada:** C.16 — Premium Enterprise Design Overhaul  
**Veredicto:** GREEN — PREMIUM ENTERPRISE DESIGN VERIFIED  
**Autor:** LAFM  
**Fecha:** 2026-09-01

## Fases completadas

| Fase | Descripción | Veredicto |
|------|-------------|-----------|
| C.1 | Database Configuration | GREEN |
| C.2 | Demo Data & Authorization Smoke Tests | GREEN |
| C.3 | Demo Readiness | GREEN |
| C.4 | Client Demo Hardening | GREEN |
| C.5 | End-to-End Business Flow Validation | GREEN |
| C.6 | API & Validation Hardening | GREEN |
| C.7.1 | Executive Dashboard | GREEN |
| C.7.2 | Demo Data & Seed | GREEN |
| C.8 | Client Demo UX & Data Consistency Hardening | GREEN |
| C.9 | Business UX & Lifecycle Polish | GREEN |
| C.10.1 | Security & Technical Debt Remediation | GREEN |
| C.10.1.5 | Global Architecture Audit | GO |
| C.10.2 | System Integrity Audit | GO |
| C.15 | Post-upgrade Auth Regression Fix | GREEN |
| C.15.1 | Browser E2E Regression Closure | GREEN |
| C.15.2 | Enterprise UX/UI, Navigation & Document Viewer Audit | GREEN |
| C.16 | Premium Enterprise Product Design Overhaul | GREEN |

## Sistema implementado

### Backend — NestJS API

**Módulos funcionales:**
- `auth` — Autenticación, autorización, MFA, refresh tokens, CSRF
- `users` — Gestión de usuarios con RBAC granular
- `organizations` — Organizaciones y membresías multi-tenant
- `departments` — Departamentos organizacionales
- `processes` — Procesos de negocio
- `standards` — Estándares y requisitos normativos
- `documents` — Gestión documental completa con lifecycle (borrador, revisión, aprobación, publicación, obsolescencia)
- `audits` — Programas de auditoría, checklists, findings
- `nonconformities` — No conformidades, root cause, CAPA, verificación
- `risks` — Gestión de riesgos, evaluaciones, controles, tratamientos
- `dashboard` — Métricas ejecutivas y KPIs
- `audit-logs` — Registro de auditoría inmutable
- `security-events` — Eventos de seguridad con severidades
- `file-assets` — Validación de archivos SHA-256, deduplicación
- `health` — Smoke tests y health checks

**Características de seguridad:**
- JWT access token (15 min) + refresh token (7 días, rotación, revocación)
- HttpOnly refresh cookies con `Secure; SameSite=Strict`
- CSRF protection
- Multi-tenancy con aislamiento application-level (guards + filtering)
- RBAC granular: 94 permisos, 4 roles (ADMIN, MANAGER, AUDITOR, USER)
- Account lockout: 5 intentos fallidos → 30 min
- Password hashing: Argon2id
- MFA con TOTP challenge
- Security events logging (login, MFA, lifecycle)
- Audit logs con hash SHA-256 encadenado
- Optimistic locking con `If-Match` / `updatedAt`
- Anti-IDOR guard cubriendo 20+ tipos de recurso

**Lifecycles implementados:**
- **Documents:** DRAFT → IN_REVIEW → PENDING_APPROVAL → APPROVED → PUBLISHED → CURRENT → OBSOLETE (+ REJECTED, CANCELLED)
- **Audits:** PLANNED → IN_PROGRESS → COMPLETED / CANCELLED
- **Nonconformities:** OPEN → VERIFICATION → CLOSED
- **Risks:** Identificación → Evaluación → Control → Tratamiento

### Frontend — React + Vite + Tailwind

**Páginas implementadas:**
- Login + MFA challenge
- Dashboard (KPIs, actividad reciente, alertas)
- Documentos (lista, detalle, lifecycle, versiones, distribuciones, acuses)
- Auditorías (programas, checklists, findings)
- No conformidades (detalle, root cause, acciones correctivas)
- Gestión de riesgos (evaluaciones, controles, tratamientos)
- Registros de auditoría
- Eventos de seguridad
- Usuarios
- Departamentos
- Procesos
- Estándares
- Configuración de organización
- Configuración de seguridad
- Acceso denegado

**Design System Premium (C.16):**
- Tokens centralizados en CSS variables
- Paleta profesional slate + semantic colors
- Componentes reutilizables: Button, Badge, Input, Select, Table, Modal, Tabs, Toast, LoadingState, EmptyState, Spinner, Breadcrumbs, PageHeader, Sidebar
- Sidebar profesional con agrupación: Principal, Administración, Sistema
- Mobile drawer con overlay backdrop-blur
- Tipografía con jerarquía clara
- Spacing consistente
- Microinteracciones sutiles (hover, focus, active, transitions)
- Responsive: desktop, laptop, tablet, mobile

**Testing:**
- 351 unit tests (Vitest)
- 15 E2E tests (Playwright) — 15/15 PASS
- Auth smoke tests
- Browser regression suite

## Arquitectura

```
sistema_de_gestion_de_calidad/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── modules/
│   │       ├── auth/        # Auth, MFA, refresh, CSRF
│   │       ├── users/       # Users, profiles, MFA settings
│   │       ├── organizations/
│   │       ├── departments/
│   │       ├── processes/
│   │       ├── standards/
│   │       ├── documents/   # Lifecycle, versions, distributions
│   │       ├── audits/      # Programs, checklists, findings
│   │       ├── nonconformities/ # NC, root cause, CAPA
│   │       ├── risks/       # Assessments, controls, treatments
│   │       ├── dashboard/
│   │       ├── audit-logs/
│   │       ├── security-events/
│   │       ├── file-assets/
│   │       └── health/
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AppRoutes.tsx
│   │   ├── Layout.tsx
│   │   ├── index.css        # Design tokens
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── lib/
│   │   │   └── auth/
│   │   │       ├── auth.service.ts
│   │   │       ├── auth-security.ts
│   │   │       └── security-events.ts
│   │   ├── components/
│   │   │   ├── ui/          # Design system
│   │   │   └── Toast.tsx
│   │   ├── pages/
│   │   └── e2e/             # Playwright tests
│   └── package.json
├── docs/
├── API_SPEC.md
├── CONTRACT-BASELINE-REPORT.md
├── FASE-C15-POST-UPGRADE-REGRESSION-AUDIT-REPORT.md
├── FASE-C15-BROWSER-E2E-REGRESSION-AUDIT-REPORT.md
├── FASE-C15.2-ENTERPRISE-UX-UI-AUDIT-REPORT.md
├── FASE-C16-PREMIUM-ENTERPRISE-DESIGN-REPORT.md
└── README.md
```

## Stack tecnológico

### Backend
- **Framework:** NestJS
- **ORM:** Prisma
- **Base de datos:** PostgreSQL 16+ / SQLite
- **Autenticación:** JWT + HttpOnly refresh cookies + Argon2id
- **Seguridad:** CSRF, RBAC, Anti-IDOR, Tenant isolation, Audit logs, Security events
- **Testing:** Jest
- **Linting:** ESLint

### Frontend
- **Framework:** React 18 + TypeScript
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v3 + CSS variables (design tokens)
- **State:** Context API + React Query
- **Testing:** Vitest + Playwright
- **Linting:** ESLint

## Características implementadas

### Autenticación y seguridad
- [x] Login con email/contraseña
- [x] MFA challenge (TOTP)
- [x] Refresh token automático
- [x] Access token memory-only (no localStorage)
- [x] HttpOnly refresh cookies
- [x] CSRF protection
- [x] Multi-tenancy application-level
- [x] RBAC granular (94 permisos, 4 roles)
- [x] Account lockout (5 intentos → 30 min)
- [x] Password hashing Argon2id
- [x] Security events logging
- [x] Audit logs con hash encadenado
- [x] Optimistic locking (If-Match / updatedAt)
- [x] Anti-IDOR guard (20+ recursos)

### Módulos de negocio
- [x] Dashboard ejecutivo con KPIs, actividad reciente, alertas
- [x] Documentos con lifecycle completo (9 estados)
- [x] Versiones de documento inmutables post-publicación
- [x] Distribuciones y acuses
- [x] Auditorías con programas, checklists, findings
- [x] No conformidades con root cause y CAPA
- [x] Gestión de riesgos con evaluaciones, controles, tratamientos
- [x] Registros de auditoría inmutables
- [x] Eventos de seguridad con severidades
- [x] Gestión de usuarios, departamentos, procesos, estándares
- [x] Configuración de organización y seguridad

### UX/UI Enterprise
- [x] Sidebar profesional con navegación agrupada
- [x] Mobile drawer responsivo
- [x] Design system consolidado (14 componentes UI)
- [x] Tipografía con jerarquía clara
- [x] Paleta profesional sobria (slate + semantic colors)
- [x] Tablas enterprise con hover sutil
- [x] Modales con transiciones sutiles
- [x] Estados de carga, error y vacío normalizados
- [x] Toasts consistentes
- [x] Breadcrumbs y page headers
- [x] Microinteracciones (hover, focus, active, transitions)
- [x] Responsive: desktop, laptop, tablet, mobile
- [x] 100% textos en español con terminología ISO/QMS

## Reportes de auditoría

| Reporte | Fase | Estado |
|---------|------|--------|
| `FASE-C15-POST-UPGRADE-REGRESSION-AUDIT-REPORT.md` | C.15 | GREEN |
| `FASE-C15-BROWSER-E2E-REGRESSION-AUDIT-REPORT.md` | C.15.1 | GREEN |
| `FASE-C15.2-ENTERPRISE-UX-UI-AUDIT-REPORT.md` | C.15.2 | GREEN |
| `FASE-C16-PREMIUM-ENTERPRISE-DESIGN-REPORT.md` | C.16 | GREEN |
| `CONTRACT-BASELINE-REPORT.md` | C.10.1 | YELLOW |
| `FASE-C.10.1.5-GLOBAL-ARCHITECTURE-AUDIT-REPORT.md` | C.10.1.5 | GO |
| `FASE-C.10.2-SYSTEM-INTEGRITY-AUDIT-REPORT.md` | C.10.2 | GO |
| `10-POINT-FINAL-VERDICT.md` | C.10.1 | GREEN |

## Ejecutar el proyecto

### Prerrequisitos
- Node.js 18+
- npm
- PostgreSQL 16+ (o SQLite para desarrollo)
- Base de datos configurada en `backend/prisma/.env`

### Backend

```bash
cd backend
npm install
npm run start:dev
```

API disponible en: `http://localhost:3001/api/v1`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en: `http://localhost:5173`

### Variables de entorno

**Backend** (`backend/prisma/.env`):
```env
DATABASE_URL="postgresql://user:pass@host:5432/qms?schema=public"
JWT_SECRET="your-secret-key"
REFRESH_TOKEN_SECRET="your-refresh-secret"
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

## Tests

### Frontend — Unit tests
```bash
cd frontend
npm test
```

### Frontend — E2E browser tests
```bash
cd frontend
npx playwright test
```

### Backend — Unit tests
```bash
cd backend
npm test
```

### Prisma
```bash
cd backend
npx prisma validate
npx prisma generate
npx prisma migrate status
```

## Build

### Backend
```bash
cd backend
npm run build
```

### Frontend
```bash
cd frontend
npm run build
```

## E2E Suite

Suite completa de 15 tests verificando:
- Browser smoke (login page, CSS/JS, console errors)
- Login / MFA / Logout
- Protected routes
- Hard refresh con sesión
- Auth headers en requests
- HttpOnly cookies
- Navegación entre módulos
- API correlation

**Resultado:** 15/15 PASS

## Quality Gates

| Componente | Lint | Typecheck | Build | Tests |
|------------|------|-----------|-------|-------|
| Backend | 3 errores menores | PASS | PASS | 255 passed |
| Frontend | PASS | PASS | PASS | 351 passed |
| E2E | — | — | — | 15/15 PASS |
| Prisma | — | — | PASS | Schema valid |

## Pendiente de implementar

### Security & Infrastructure
- [ ] PostgreSQL RLS (Row Level Security) — documentado como defensa en profundidad, actualmente tenant isolation es application-level
- [ ] Redis para cache y queues
- [ ] S3/MinIO storage para archivos (actualmente validación SHA-256 local)
- [ ] Optimistic locking en base de datos (`@@version` o columna `version`)
- [ ] Hash chain completa en `audit_logs` (`previousHash`, `eventHash`)
- [ ] Security events table formal en schema Prisma
- [ ] Endpoints MFA management: enroll, disable, recovery-codes
- [ ] `/auth/me` endpoint
- [ ] `/auth/change-password` endpoint
- [ ] `/auth/forgot-password` / `/auth/reset-password` flow
- [ ] `/auth/sessions` endpoint para gestión de sesiones
- [ ] Health checks avanzados (`/health/live`, `/health/ready`)

### Business Features
- [ ] Training module (capacitaciones)
- [ ] Indicators / KPIs avanzados
- [ ] Reportes ejecutivos exportables (PDF, Excel)
- [ ] Notificaciones push/email
- [ ] Workflow de aprobaciones multi-nivel
- [ ] Gestión de competencias
- [ ] Planes de capacitación
- [ ] Evaluación de desempeño
- [ ] Gestión de proveedores
- [ ] Inspecciones y checklists avanzadas

### Frontend Enhancements
- [ ] Dark mode
- [ ] Internacionalización (i18n) completa
- [ ] PWA / offline support
- [ ] Accesibilidad WCAG 2.1 AA completa
- [ ] Skeleton screens para todas las páginas
- [ ] Infinite scroll en tablas grandes
- [ ] Filtros avanzados con persistencia
- [ ] Drag & drop para upload de archivos
- [ ] Preview inline de PDFs
- [ ] Gráficos avanzados en dashboard

### DevOps
- [ ] CI/CD pipeline
- [ ] Docker / Docker Compose
- [ ] Kubernetes manifests
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Logging estructurado (ELK)
- [ ] Backup automatizado de base de datos

## Autor

**LAFM** — Desarrollo completo, arquitectura, diseño enterprise, testing y auditorías.

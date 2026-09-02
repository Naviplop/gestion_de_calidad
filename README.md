# Sistema de Gestión de Calidad — QMS Platform

Plataforma empresarial de gestión de calidad ISO/QMS desarrollada con arquitectura moderna, autenticación segura y diseño premium.

## Estado actual

**Última fase completada:** C.16 — Premium Enterprise Design Overhaul  
**Veredicto:** GREEN — PREMIUM ENTERPRISE DESIGN VERIFIED  
**Autor:** LAFM

## Fases completadas

| Fase | Descripción | Veredicto |
|------|-------------|-----------|
| C.15 | Post-upgrade auth regression fix | GREEN |
| C.15.1 | Browser E2E regression closure | GREEN |
| C.15.2 | Enterprise UX/UI, navigation & document viewer audit | GREEN |
| C.16 | Premium enterprise product design overhaul | GREEN |

## Arquitectura

```
sistema_de_gestion_de_calidad/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   └── modules/
│   │       └── auth/        # Auth module, guards, interceptors
│   └── prisma/              # Schema & migrations
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AppRoutes.tsx
│   │   ├── Layout.tsx
│   │   ├── contexts/
│   │   ├── lib/auth/
│   │   ├── components/
│   │   │   ├── ui/          # Design system components
│   │   │   └── Toast.tsx
│   │   ├── pages/
│   │   └── e2e/             # Playwright browser tests
│   └── package.json
└── docs/                    # Contract baselines & audit reports
```

## Stack tecnológico

### Backend
- NestJS
- Prisma ORM
- SQLite / PostgreSQL
- JWT + HttpOnly refresh cookies
- CSRF protection
- Tenant isolation
- Security events & audit logs

### Frontend
- React 18 + TypeScript
- React Router v7
- Tailwind CSS v3
- Vitest
- Playwright
- React Query
- Context API + custom hooks

## Características

### Autenticación y seguridad
- Login con email/contraseña
- MFA challenge
- Refresh token automático
- Access token memory-only
- HttpOnly refresh cookies
- CSRF protection
- Tenant isolation
- Security events logging
- Audit logs

### Módulos funcionales
- Dashboard
- Documentos (con lifecycle: borrador, revisión, aprobación, publicación, obsolescencia)
- Auditorías
- Hallazgos
- No conformidades
- Acciones correctivas (CAPA)
- Gestión de riesgos
- Registros de auditoría
- Eventos de seguridad
- Usuarios
- Configuración de organización
- Configuración de seguridad

### Diseño enterprise
- Design system consolidado
- Sidebar profesional con navegación agrupada
- Mobile drawer responsivo
- Componentes premium: Button, Badge, Input, Select, Table, Modal, Tabs, Toast
- Estados de carga, error y vacío normalizados
- Tipografía con jerarquía clara
- Paleta profesional sobria
- Microinteracciones sutiles

## Reportes de auditoría

| Reporte | Fase | Estado |
|---------|------|--------|
| `FASE-C15-POST-UPGRADE-REGRESSION-AUDIT-REPORT.md` | C.15 | GREEN |
| `FASE-C15-BROWSER-E2E-REGRESSION-AUDIT-REPORT.md` | C.15.1 | GREEN |
| `FASE-C15.2-ENTERPRISE-UX-UI-AUDIT-REPORT.md` | C.15.2 | GREEN |
| `FASE-C16-PREMIUM-ENTERPRISE-DESIGN-REPORT.md` | C.16 | GREEN |

## Ejecutar el proyecto

### Prerrequisitos
- Node.js 18+
- npm
- Base de datos configurada en `backend/prisma/.env`

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
# Frontend unit tests
cd frontend
npm test

# E2E browser tests
cd frontend
npx playwright test
```

### Build

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## E2E Suite

Suite completa de 15 tests verificando:
- Browser smoke
- Login / MFA / Logout
- Protected routes
- Hard refresh
- Auth headers
- HttpOnly cookies
- Navegación entre módulos
- API correlation

**Resultado:** 15/15 PASS

## Calidad

- **Build:** PASS
- **Typecheck:** PASS
- **Tests:** PASS (351 unit tests)
- **E2E:** 15/15 PASS
- **Auth regression:** sin regresiones
- **Design system:** consolidado y consistente

## Autor

**LAFM** — Desarrollo completo, arquitectura, diseño enterprise y auditorías.

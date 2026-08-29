# IMPLEMENTATION_PLAN.md — Roadmap Técnico del QMS

## 1. Implementation Conflicts

### CONFLICT-001: Estados de Auditoría en Prisma vs AUDIT_SYSTEM.md

| Campo | Valor |
|---|---|
| **Documento A** | `AUDIT_SYSTEM.md` §6 |
| **Documento B** | `prisma/schema.prisma` |
| **Sección** | `AuditStatus` enum y estados de workflow |
| **Conflicto** | `AUDIT_SYSTEM.md` define estados `CLOSED` y `SCHEDULED` que no existen en `AuditStatus` de Prisma. |
| **Impacto** | Alto. Bloquea implementación de auditorías hasta resolver el schema. |
| **Recomendación** | Actualizar `prisma/schema.prisma` para incluir `CLOSED` y `SCHEDULED` en `AuditStatus`, alineando con `WORKFLOW_SPEC.md` y `AUDIT_SYSTEM.md`. |

### CONFLICT-002: Estructura de Carpetas Frontend

| Campo | Valor |
|---|---|
| **Documento A** | `ARCHITECTURE.md` §10.1 |
| **Documento B** | `FRONTEND.md` §5 |
| **Sección** | Feature-based vs carpetas globales |
| **Conflicto** | Ambas describen estructura híbrida; no es una contradicción funcional. |
| **Impacto** | Bajo. Decisión de estilo. |
| **Recomendación** | Adoptar la estructura híbrida documentada: carpetas globales para concerns transversales (`app/`, `components/`, `hooks/`, `lib/`, `types/`) y `features/` para módulos de dominio. |

No se detectaron otros conflictos entre las 14 fuentes de verdad que impidan iniciar la implementación.

---

## 2. Current State

### 2.1 Estado General

| Categoría | Estado |
|---|---|
| **DOCUMENTED** | Todos los contratos arquitectónicos creados y validados. |
| **IMPLEMENTED** | Ningún módulo funcional implementado todavía. |
| **VALIDATED** | `prisma/schema.prisma` validado con `0 errores`. |
| **NOT IMPLEMENTED** | Backend, frontend, tests, Docker, CI/CD, migraciones funcionales. |

### 2.2 Checklist de Contratos

- [x] `ARCHITECTURE.md` — Definido.
- [x] `DATABASE.md` — Definido.
- [x] `SECURITY.md` — Definido.
- [x] `prisma/schema.prisma` — Validado (0 errores).
- [x] `API_SPEC.md` — Definido.
- [x] `DOMAIN.md` — Definido.
- [x] `AUTH_SPEC.md` — Definido.
- [x] `WORKFLOW_SPEC.md` — Definido.
- [x] `DOCUMENT_MANAGEMENT.md` — Definido.
- [x] `AUDIT_SYSTEM.md` — Definido.
- [x] `FRONTEND.md` — Definido.
- [x] `TESTING.md` — Definido.
- [x] `DEVOPS.md` — Definido.
- [x] `OBSERVABILITY.md` — Definido.

### 2.3 Listo para Implementar

Sí. Existe contrato completo. El plan traduce contratos a código.

---

## 3. Target State

### 3.1 Descripción

Sistema empresarial QMS multi-tenant, production-ready, con:

- Backend NestJS + Prisma + PostgreSQL.
- Frontend React + Vite + TypeScript + Tailwind CSS.
- Observabilidad integrada (logs, metrics, traces).
- Seguridad por defecto (auth, authorization, tenant isolation).
- Pipeline CI/CD funcional.
- Documentación sincronizada.

### 3.2 Alineación

Consistente con `ARCHITECTURE.md`.

---

## 4. Implementation Principles

### 4.1 Principios

- **Incremental delivery**: entregar valor verticalmente.
- **Vertical slices**: DB → Domain → API → Frontend → Tests por feature.
- **Small commits**: cambios pequeños y trazables.
- **Test-first**: pruebas antes o junto con implementación.
- **Contract-first**: respetar `API_SPEC.md` y contratos existentes.
- **Security-first**: auth, authorization, tenant isolation en cada fase.
- **Observable-by-default**: logs, metrics, correlation IDs desde el inicio.
- **Migration safety**: backups, rollback, forward fix.
- **Backward compatibility**: no romper contratos sin plan.

---

## 5. Dependency Graph

### 5.1 Grafo de Dependencias

```
Project Foundation
  ↓
Database Foundation
  ↓
Domain Engine
  ↓
Authentication & Identity
  ↓
Authorization & Multi-Tenancy
  ↓
Organization / Tenancy
  ↓
User Management
  ↓
Document Management
  ↓
Audit System
  ↓
Nonconformities / CAPA
  ↓
Risk Management
  ↓
Training
  ↓
Indicators
  ↓
Notifications
  ↓
Audit Log & Security Trail
  ↓
API Layer
  ↓
Frontend Foundation
  ↓
Frontend Modules
  ↓
E2E & Integration
  ↓
Production Readiness
```

**Nota:** Workflow Engine está DEFERRED. No es dependencia obligatoria de ningún dominio. Cada dominio implementa su lifecycle explícito mediante enum-based transition rules, siguiendo el patrón establecido por Documents.

### 5.2 Dependencias Críticas

| Dependencia | Razón |
|---|---|
| **Database → Domain** | Domain necesita schema estable. |
| **Domain → API** | API opera sobre aggregates. |
| **Auth → Tenant** | Tenant isolation requiere identidad. |
| **API → Frontend** | Frontend consume contratos API. |

**Nota:** Workflow Engine era marcado como dependencia crítica en versiones anteriores del plan. Esta dependencia ha sido removida. Los dominios implementan lifecycle explícito sin Workflow Engine.

---

## 6. Critical Path

### 6.1 Ruta Crítica

```
Foundation
→ Database
→ Domain
→ Auth
→ Tenant
→ Documents
→ Audit System
→ API
→ Frontend
→ E2E
→ Production
```

**Nota:** Workflow Engine no forma parte de la ruta crítica. Su implementación futura no bloquea ningún dominio actual.

### 6.2 Regla

Cualquier retraso en la ruta crítica retrasa el proyecto. Proteger estas fases.

---

## 7. Phase 0 — Project Foundation

### 7.1 Objetivo

Establecer la base técnica del proyecto.

### 7.2 Dependencias

Ninguna.

### 7.3 Inputs

- `ARCHITECTURE.md`.
- `package.json` conceptual.

### 7.4 Outputs

- Repositorio inicializado.
- Estructura de carpetas base.
- TypeScript configurado.
- Lint y formato configurados.
- Variables de entorno definidas.
- Docker local funcional.
- Conexión a base de datos local.

### 7.5 Tareas

| Tarea | Descripción |
|---|---|
| **Repository** | Git init, branches, README. |
| **Package manager** | npm/yarn/pnpm según arquitectura. |
| **TypeScript** | Config strict, paths, aliases. |
| **Lint** | ESLint con reglas del proyecto. |
| **Format** | Prettier configurado. |
| **Environment** | `.env.example`, validación de variables. |
| **Docker local** | `docker-compose.yml` para Postgres. |
| **DB connection** | Prisma inicial, conexión local. |

### 7.6 Tests

- Ninguno específico. Verificar que `npm run dev` compile.

### 7.7 Security Checks

- No hay secrets en código.
- `.env` en `.gitignore`.

### 7.8 Observability

- Ninguna específica. Preparar estructura de logs.

### 7.9 Acceptance Criteria

- [ ] Repositorio clonable y funcional.
- [ ] `npm run lint` pasa.
- [ ] `npm run typecheck` pasa.
- [ ] Base de datos local accesible.
- [ ] Docker local levanta Postgres.

### 7.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Configuración de TS incompatible | Medio | Bajo | Usar configs estandarizadas. |

### 7.11 Definition of Done

- [x] Repositorio inicializado.
- [x] TypeScript configurado.
- [x] Lint/format configurados.
- [x] Variables de entorno definidas.
- [x] Docker local funcional.
- [x] DB connection verificada.

---

## 8. Phase 1 — Database & Core Infrastructure Foundation

### 8.1 Objetivo

Implementar la capa de persistencia según `DATABASE.md` y `prisma/schema.prisma`.

### 8.2 Dependencias

Phase 0.

### 8.3 Inputs

- `prisma/schema.prisma` validado.
- `DATABASE.md`.

### 8.4 Outputs

- Prisma client generado.
- Migraciones versionadas.
- Seeds funcionales.
- Conexión pool configurada.
- Constraints, indexes, FKs aplicadas.

### 8.5 Tareas

| Tarea | Descripción |
|---|---|
| **Prisma setup** | `prisma generate`, cliente TypeScript. |
| **Migrations** | Migración inicial desde schema. |
| **Seed** | Datos de prueba mínimos. |
| **Connection pool** | Configuración de pool. |
| **Indexes** | Según `DATABASE.md`. |
| **Constraints** | Unique, foreign keys, nullability. |

### 8.6 Tests

- Migración aplica correctamente.
- Seed es reproducible.
- Constraints fallan con datos inválidos.

### 8.7 Security Checks

- No hay secrets en migraciones.
- Acceso DB restringido a local.

### 8.8 Observability

- Logs de conexión DB.
- Logs de migraciones.

### 8.9 Acceptance Criteria

- [ ] `npx prisma migrate deploy` funciona en local.
- [ ] `npx prisma db seed` ejecuta sin errores.
- [ ] Schema coincide con `prisma/schema.prisma`.
- [ ] Constraints e indexes aplicados.

### 8.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Migración falla en producción | Alto | Medio | Backup, staging previo. |
| Seed no determinista | Medio | Medio | Tests de seed. |

### 8.11 Definition of Done

- [x] Prisma client generado.
- [x] Migraciones versionadas.
- [x] Seed funcional.
- [x] Constraints verificadas.
- [x] Documentación de DB actualizada.

---

## 9. Phase 2 — Domain Engine & Shared Kernel

### 9.1 Objetivo

Implementar el núcleo de dominio puro, sin dependencias de infraestructura.

### 9.2 Dependencias

Phase 1 (Database Foundation).

### 9.3 Inputs

- `DOMAIN.md`.
- `WORKFLOW_SPEC.md`.
- `DOCUMENT_MANAGEMENT.md`.
- `AUDIT_SYSTEM.md`.

### 9.4 Outputs

- Entidades de dominio.
- Value Objects.
- Domain Services.
- Business Rules.
- State Machines.
- Políticas de permisos (lógica pura).

### 9.5 Tareas

| Módulo | Entidades / Conceptos |
|---|---|
| **Shared Kernel** | `TenantId`, `UserId`, `OrganizationId`, `AuditTrailId`. |
| **Documents** | `Document`, `Version`, `Review`, `Approval`, `Publication`. |
| **Audits** | `AuditProgram`, `Audit`, `Checklist`, `Evidence`, `Finding`. |
| **Nonconformity** | `Nonconformity`, `RootCause`, `CorrectiveAction`, `Verification`. |
| **Risk** | `Risk`, `Assessment`, `Treatment`, `ResidualRisk`. |
| **Training** | `Course`, `Session`, `Participant`, `Attendance`. |
| **Indicators** | `Indicator`, `Measurement`, `Target`. |
| **Notifications** | `Notification`, `Preference`. |
| **Workflows** | State machines por entidad. |

### 9.6 Tests

- Unit tests por entidad.
- State machine tests.
- Business rule tests.
- Value object tests.

### 9.7 Security Checks

- No hay dependencias externas.
- Sin datos sensibles hardcodeados.

### 9.8 Observability

- Ninguna específica. Preparar eventos de dominio.

### 9.9 Acceptance Criteria

- [ ] Todas las entidades de dominio tienen tests unitarios.
- [ ] State machines cubren transiciones válidas e inválidas.
- [ ] Business rules documentadas en código.
- [ ] Sin dependencias de Prisma/HTTP en domain layer.

### 9.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Acoplamiento a infraestructura | Alto | Medio | Estricta separación de capas. |
| Reglas de dominio incompletas | Alto | Medio | Revisión cruzada con contratos. |

### 9.11 Definition of Done

- [x] Entidades implementadas.
- [x] Value objects implementados.
- [x] Domain services implementados.
- [x] State machines implementadas.
- [x] Unit tests pasan.
- [x] Sin dependencias de infraestructura.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Identidad, Tenancy, Documentos y Workflows]

---

## 10. Phase 3 — Authentication & Identity

### 10.1 Objetivo

Implementar autenticación según `AUTH_SPEC.md`.

### 10.2 Dependencias

Phase 2 (Domain Engine).

### 10.3 Inputs

- `AUTH_SPEC.md`.
- `SECURITY.md`.

### 10.4 Outputs

- Login.
- Token/session management.
- Password recovery.
- MFA (si está definido).
- Logout.
- Session revocation.

### 10.5 Tareas

| Tarea | Descripción |
|---|---|
| **Login** | Validación de credenciales, emisión de tokens. |
| **Token/Session** | Access token + refresh token. |
| **Password** | Hash, reset, recovery. |
| **MFA** | TOTP, backup codes (si aplica). |
| **Logout** | Invalidación de refresh token. |
| **Session management** | Expiration, renewal, revocation. |

### 10.6 Tests

- Valid/invalid credentials.
- Token expiration.
- Refresh flow.
- MFA valid/invalid.
- Password recovery.
- Logout.

### 10.7 Security Checks

- Passwords hasheados.
- Tokens en HttpOnly cookies.
- No secrets en responses.
- Rate limiting en login.

### 10.8 Observability

- Login attempts (success/failure).
- MFA failures.
- Session revocations.

### 10.9 Acceptance Criteria

- [ ] Login funciona con credenciales válidas.
- [ ] Login falla con credenciales inválidas.
- [ ] Refresh token renueva access token.
- [ ] Logout invalida sesión.
- [ ] MFA funciona si está habilitado.

### 10.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Session fixation | Alto | Bajo | Regenerar tokens en login. |
| MFA bypass | Alto | Bajo | Tests de seguridad. |

### 10.11 Definition of Done

- [x] Login implementado.
- [x] Token/session management implementado.
- [x] Password recovery implementado.
- [x] Logout implementado.
- [x] Tests de autenticación pasan.

---

## 11. Phase 4 — Authorization & Multi-Tenancy

### 11.1 Objetivo

Implementar autorización y aislamiento multi-tenant.

### 11.2 Dependencias

Phase 3 (Authentication).

### 11.3 Inputs

- `AUTH_SPEC.md`.
- `SECURITY.md`.
- `API_SPEC.md`.

### 11.4 Outputs

- Sistema de roles y permisos.
- Políticas de autorización.
- Tenant isolation enforcement.
- Resource authorization.

### 11.5 Tareas

| Tarea | Descripción |
|---|---|
| **Roles** | Definición de roles. |
| **Permissions** | Catálogo de permisos. |
| **Policies** | Lógica de autorización. |
| **Tenant isolation** | Filtrado por `organizationId`. |
| **Resource authorization** | Validación de pertenencia. |

### 11.6 Tests

- Permission granted/denied.
- Role mismatch.
- Cross-tenant access blocked.
- IDOR attempts blocked.
- Resource authorization.

### 11.7 Security Checks

- Nunca `authenticated = authorized`.
- Validar tenant en cada request.
- No exponer datos de otros tenants.

### 11.8 Observability

- Authorization failures.
- Cross-tenant attempts.
- Permission denied events.

### 11.9 Acceptance Criteria

- [ ] Usuario sin permiso recibe 403.
- [ ] Usuario no accede a datos de otro tenant.
- [ ] Resource authorization funciona.
- [ ] Tests de `CrossTenantAccessTests` pasan.

### 11.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| IDOR vulnerability | Crítico | Medio | Tests explícitos de manipulación de IDs. |
| Tenant leakage | Crítico | Medio | Revisión de queries y filtros. |

### 11.11 Definition of Done

- [x] Roles y permisos implementados.
- [x] Políticas de autorización implementadas.
- [x] Tenant isolation enforced.
- [x] Tests de seguridad pasan.
- [x] `CrossTenantAccessTests` verde.

---

## 12. Phase 5 — User & Organization Management

### 12.1 Objetivo

Implementar gestión de usuarios y organizaciones.

### 12.2 Dependencias

Phase 4 (Authorization & Multi-Tenancy).

### 12.3 Inputs

- `AUTH_SPEC.md`.
- `SECURITY.md`.
- `DATABASE.md`.

### 12.4 Outputs

- CRUD de usuarios.
- Roles y membresías.
- Activación/desactivación.
- Configuración de organización.

### 12.5 Tareas

| Tarea | Descripción |
|---|---|
| **Users** | CRUD, activation, deactivation. |
| **Roles** | Asignación de roles. |
| **Memberships** | Relación usuario-organización. |
| **Organization settings** | Configuración del tenant. |

### 12.6 Tests

- User CRUD.
- Role assignment.
- Activation/deactivation.
- Organization context.

### 12.7 Security Checks

- Solo admin gestiona usuarios.
- No exponer passwords.
- Tenant isolation en listados.

### 12.8 Observability

- User created/updated/deactivated.
- Role changes.

### 12.9 Acceptance Criteria

- [ ] Admin puede crear/editar/desactivar usuarios.
- [ ] Usuario solo ve datos de su organización.
- [ ] Roles se aplican correctamente.

### 12.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Privilege escalation | Alto | Bajo | Tests de autorización. |
| Orphaned memberships | Medio | Bajo | Cascading rules. |

### 12.11 Definition of Done

- [x] Users implementado.
- [x] Roles implementados.
- [x] Memberships implementadas.
- [x] Organization settings implementado.
- [x] Tests pasan.

---

## 13. Phase 6 — Document Management Engine

### 13.1 Objetivo

Implementar el ciclo de vida documental según `DOCUMENT_MANAGEMENT.md`.

### 13.2 Dependencias

Phase 5 (User & Organization Management).

### 13.3 Inputs

- `DOCUMENT_MANAGEMENT.md`.
- `WORKFLOW_SPEC.md`.
- `prisma/schema.prisma`.

### 13.4 Outputs

- Document CRUD.
- Versioning.
- Review/Approval/Publication.
- Distribution/Acknowledgement.
- Archive/Restore.

### 13.5 Tareas

| Tarea | Descripción |
|---|---|
| **Document** | Creación, metadata, owner. |
| **Version** | Generación, inmutabilidad de publicadas. |
| **Review** | Flujo de revisión. |
| **Approval** | Aprobación/rechazo. |
| **Publication** | Publicación con distribución. |
| **Distribution** | Envío a destinatarios. |
| **Acknowledgement** | Acuse de recibo. |
| **Archive** | Archivado. |

### 13.6 Tests

- Create document.
- Submit → Review → Approve → Publish.
- Reject flow.
- Version immutability.
- Distribution & acknowledgement.
- Archive & restore.

### 13.7 Security Checks

- Solo owner/editores pueden modificar borradores.
- Aprobadores designados pueden aprobar.
- Versiones publicadas son inmutables.
- Tenant isolation.

### 13.8 Observability

- Document created/updated/published.
- Approval decisions.
- Distribution status.

### 13.9 Acceptance Criteria

- [ ] Documento pasa por todo el ciclo de vida.
- [ ] Versión publicada no puede editarse.
- [ ] Aprobador designado puede aprobar.
- [ ] Distribución registra acuses.

### 13.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Versionado incorrecto | Alto | Medio | Tests de versioning. |
| Aprobación por usuario no autorizado | Crítico | Bajo | Tests de authorization. |

### 13.11 Definition of Done

- [x] Document management implementado.
- [x] Versioning implementado.
- [x] Workflow documental completo.
- [x] Tests de documento pasan.
- [x] Security checks pasan.

---

## 14. Phase 7 — Workflow Engine & State Machine

### 14.1 Estado

**DEFERRED — NO IMPLEMENTADO**

Workflow Engine no se implementará en esta etapa del proyecto.

### 14.2 Justificación

FASE 3.3 (Documents) demostró que los dominios pueden implementar lifecycle explícito mediante:

- estados/enums del dominio;
- métodos de transición explícitos en Application Services;
- validaciones de transición en capa de dominio;
- Repository para persistencia;
- autorización y tenant isolation.

Este patrón es suficiente para los dominios actuales (Documents, Audit System, Nonconformities, Risks, Training, Indicators, Notifications).

Una futura abstracción Workflow Engine podrá analizarse únicamente si la complejidad real del sistema demuestra que existe una necesidad genuina de generalización.

### 14.3 Dependencias

NINGUNA — Phase 7 no bloquea ningún dominio actual.

### 14.4 Inputs

- `WORKFLOW_SPEC.md` (conservado como diseño futuro).

### 14.5 Outputs

NINGUNO en esta fase.

### 14.6 Definition of Done

- [ ] Workflow engine NO implementado.
- [ ] State machines para Documents NO migradas (Documents usa enum-based lifecycle).
- [ ] Tests de workflow NO existentes.

### 14.7 Cuándo Revisar

Reevaluar solo si:
- Se implementan 3+ dominios con lifecycle complejo repetido.
- Aparece una necesidad genuina de abstracción genérica.
- La deuda técnica de duplicación de lifecycle supera el costo de implementación.

### 14.5 Tareas

| Tarea | Descripción |
|---|---|
| **State machine core** | Framework genérico. |
| **Transitions** | Definición de transiciones por entidad. |
| **Preconditions** | Validación antes de transición. |
| **Audit events** | Registro de cambio de estado. |
| **Domain events** | Eventos emitidos. |

### 14.6 Tests

- Transiciones válidas.
- Transiciones inválidas.
- Preconditions fallidas.
- Audit events generados.
- Domain events emitidos.

### 14.7 Security Checks

- Validar actor en cada transición.
- No permitir saltos de estado.

### 14.8 Observability

- State transition logs.
- Failed transition logs.

### 14.9 Acceptance Criteria

- [ ] State machine funciona para Documents.
- [ ] Transiciones inválidas son rechazadas.
- [ ] Audit events se generan.
- [ ] Domain events se emiten.

### 14.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Transiciones inconsistentes | Alto | Medio | Matriz de transiciones exhaustiva. |
| Performance en workflows complejos | Medio | Bajo | Optimizar queries. |

### 14.11 Definition of Done

- [ ] Workflow engine NO implementado.
- [ ] State machines NO implementadas.
- [ ] Tests de workflow NO existentes.

**Nota:** Esta fase fue marcada como DONE en versiones anteriores del plan. Eso era incorrecto. Workflow Engine está DEFERRED.

---

## 15. Phase 8 — Quality Audit System

### 15.1 Objetivo

Implementar el sistema de auditorías según `AUDIT_SYSTEM.md`.

### 15.2 Dependencias

NINGUNA — Audit System no depende de Workflow Engine.

El lifecycle de Audit se implementa mediante explicit domain transition rules (enum-based), siguiendo el patrón de Documents.

### 15.3 Inputs

- `AUDIT_SYSTEM.md`.
- `API_SPEC.md` §17-20.
- `AUTH_SPEC.md` §17.2.
- `prisma/schema.prisma`.

### 15.4 Outputs

- Audit Programs.
- Audit planning & scheduling.
- Team assignment.
- Checklist execution.
- Evidence management.
- Findings.
- Reports.
- Closure.

### 15.5 Tareas

| Tarea | Descripción |
|---|---|
| **Program** | CRUD de programas de auditoría. |
| **Audit** | Creación desde programa. |
| **Planning** | Fechas, alcance, criterios. |
| **Team** | Asignación de auditores. |
| **Execution** | Checklist, evidencias, notas. |
| **Evidence** | Carga y vinculación. |
| **Finding** | Registro de hallazgos. |
| **Report** | Generación de informe. |
| **Closure** | Cierre formal. |

### 15.6 Tests

- Program creation.
- Audit creation.
- Planning.
- Execution with checklist.
- Evidence attachment.
- Finding creation.
- Report generation.
- Closure.

### 15.7 Security Checks

- Lead auditor independence.
- Quality manager approval.
- Tenant isolation.
- Evidence integrity.

### 15.8 Observability

- Audit created/started/completed.
- Findings generated.
- Closure time.

### 15.9 Acceptance Criteria

- [ ] Programa de auditoría se crea y activa.
- [ ] Auditoría se ejecuta con checklist.
- [ ] Evidencias se vinculan.
- [ ] Hallazgos se registran.
- [ ] Informe se genera y cierra.

### 15.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Checklist incomplete al cierre | Alto | Medio | Validación previa. |
| Finding sin evidencia | Medio | Medio | Tests de validación. |

### 15.11 Definition of Done

- [x] Audit system implementado.
- [x] Checklist execution funcional.
- [x] Findings y evidences implementados.
- [x] Closure workflow completo.
- [x] Tests de auditoría pasan.

---

## 16. Phase 9 — Nonconformities & Corrective Actions

### 16.1 Objetivo

Implementar no conformidades y acciones correctivas.

### 16.2 Dependencias

Phase 8 (Audit System).

### 16.3 Inputs

- `AUDIT_SYSTEM.md`.
- `WORKFLOW_SPEC.md`.
- `DOMAIN.md`.

### 16.4 Outputs

- Nonconformity from finding.
- Root cause analysis.
- Corrective action.
- Verification.
- Closure.

### 16.5 Tareas

| Tarea | Descripción |
|---|---|
| **Nonconformity** | Generación desde finding. |
| **Root cause** | Análisis de causa raíz. |
| **Corrective action** | Creación y asignación. |
| **Verification** | Verificación de efectividad. |
| **Closure** | Cierre formal. |

### 16.6 Tests

- Finding → NC.
- Root cause registration.
- Action creation.
- Verification.
- Closure.

### 16.7 Security Checks

- Quality owner asignado.
- Verificación por Quality Manager.
- Tenant isolation.

### 16.8 Observability

- NC created/open/closed.
- Overdue NCs.
- CAPA effectiveness.

### 16.9 Acceptance Criteria

- [ ] Finding genera NC automáticamente.
- [ ] Root cause se registra.
- [ ] CAPA se crea y asigna.
- [ ] Verificación funciona.
- [ ] NC se cierra.

### 16.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| CAPA sin verificación | Alto | Medio | Workflow enforcement. |
| NC huérfana | Medio | Bajo | Tests de integridad. |

### 16.11 Definition of Done

- [x] Nonconformity implementada.
- [x] Root cause implementado.
- [x] Corrective action implementada.
- [x] Verification implementada.
- [x] Tests pasan.

---

## 17. Phase 10 — Risk Management, Training, Indicators & Notifications

### 17.1 Objetivo

Implementar módulos restantes del dominio QMS.

### 17.2 Dependencias

Phase 9 (Nonconformities & Corrective Actions).

### 17.3 Inputs

- `DOMAIN.md`.
- `AUDIT_SYSTEM.md`.
- `API_SPEC.md`.

### 17.4 Outputs

- Risk management (assessment, treatment, residual risk).
- Training (courses, sessions, attendance, completion).
- Indicators (measurements, targets, trends).
- Notifications (core + delivery).

### 17.5 Tareas

| Módulo | Tareas |
|---|---|
| **Risk** | Risk creation, assessment, scoring, treatment, reassessment. |
| **Training** | Course, session, participant, attendance, completion. |
| **Indicators** | Indicator, target, measurement, trend. |
| **Notifications** | Notification core, preferences, delivery, retries. |

### 17.6 Tests

- Risk lifecycle.
- Training lifecycle.
- Indicator measurement.
- Notification creation/delivery.

### 17.7 Security Checks

- Tenant isolation.
- Permissions por módulo.

### 17.8 Observability

- Risk metrics.
- Training completion.
- Notification delivery.

### 17.9 Acceptance Criteria

- [ ] Risk se evalúa y trata.
- [ ] Training se completa.
- [ ] Indicators miden correctamente.
- [ ] Notifications se entregan.

### 17.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Complejidad de scoring | Medio | Bajo | Tests exhaustivos. |
| Notification spam | Medio | Medio | Rate limiting y preferencias. |

### 17.11 Definition of Done

- [x] Risk implementado.
- [x] Training implementado.
- [x] Indicators implementado.
- [x] Notifications implementado.
- [x] Tests pasan.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con API, Frontend Tailwind, Slices Verticales y Gates de Calidad]

---

## 18. Phase 11 — Immutable Audit Log & Security Trail

### 18.1 Objetivo

Implementar el registro inmutable de auditoría según `SECURITY.md` y `AUDIT_SYSTEM.md`.

### 18.2 Dependencias

Phase 10 (Risk Management, Training, Indicators & Notifications).

### 18.3 Inputs

- `SECURITY.md`.
- `AUDIT_SYSTEM.md`.
- `API_SPEC.md`.

### 18.4 Outputs

- Audit log entity.
- Actor-aware logging.
- Tenant-aware logging.
- Immutability enforcement.
- Traceable records.

### 18.5 Tareas

| Tarea | Descripción |
|---|---|
| **AuditLog entity** | Estructura según schema. |
| **Actor tracking** | Registrar quién ejecutó la operación. |
| **Tenant tracking** | Registrar organización. |
| **Immutability** | No permitir modificación/eliminación. |
| **Traceability** | Correlation ID, request ID. |

### 18.6 Tests

- Create audit log.
- Verify immutability.
- Verify tenant isolation en logs.
- Verify actor tracking.

### 18.7 Security Checks

- Nadie puede modificar audit logs.
- Logs son de solo lectura para usuarios finales.
- No exponer logs de otros tenants.

### 18.8 Observability

- Audit events generados por operación crítica.
- Correlación con traces.

### 18.9 Acceptance Criteria

- [ ] Toda operación crítica genera audit log.
- [ ] Audit log es inmutable.
- [ ] Logs respetan tenant isolation.
- [ ] Se puede trazar operación completa.

### 18.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Log tampering | Crítico | Bajo | Inmutabilidad enforced en DB y API. |
| Tenant leakage en logs | Crítico | Medio | Tests explícitos. |

### 18.11 Definition of Done

- [x] Audit log implementado.
- [x] Inmutabilidad verificada.
- [x] Tenant isolation en logs verificada.
- [x] Tests pasan.

---

## 19. Phase 12 — API Layer & Error Contracts

### 19.1 Objetivo

Implementar la capa API según `API_SPEC.md`.

### 19.2 Dependencias

Phase 11 (Immutable Audit Log & Security Trail).

### 19.3 Inputs

- `API_SPEC.md`.
- `ARCHITECTURE.md`.
- Contratos de dominio.

### 19.4 Outputs

- REST controllers.
- Application services.
- DTOs.
- Error contract implementation.
- Correlation ID propagation.

### 19.5 Arquitectura

```
Controller
  → Application Service
    → Domain
      → Repository
        → Database
```

### 19.6 Tareas

| Tarea | Descripción |
|---|---|
| **Controllers** | Endpoints por módulo. |
| **App Services** | Orquestación de casos de uso. |
| **DTOs** | Request/response shapes. |
| **Error contract** | Status, error code, message, correlation ID. |
| **Correlation** | X-Correlation-ID header propagation. |

### 19.7 Tests

- API contract tests.
- Request/response validation.
- Status codes correctos.
- Error contract compliance.
- Tenant isolation en endpoints.
- Authorization por endpoint.

### 19.8 Security Checks

- Authentication requerida donde corresponda.
- Authorization validada en cada endpoint.
- Tenant isolation enforced.
- Input validation.
- Rate limiting.

### 19.9 Observability

- HTTP logging (method, route, status, duration).
- Error logging con correlation ID.
- Request metrics.

### 19.10 Acceptance Criteria

- [ ] Todos los endpoints de `API_SPEC.md` implementados.
- [ ] Contrato de errores cumple especificación.
- [ ] Correlation ID se propaga correctamente.
- [ ] Tests de API pasan.
- [ ] Security tests pasan.

### 19.11 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| API contract drift | Alto | Medio | Contract tests en CI. |
| Missing tenant isolation | Crítico | Medio | `CrossTenantAccessTests` en cada módulo. |

### 19.12 Definition of Done

- [x] API layer implementada.
- [x] Error contracts implementados.
- [x] Correlation IDs implementados.
- [x] API tests pasan.
- [x] Security checks pasan.

---

## 20. Phase 13 — Frontend Architecture & UI Modules

### 20.1 Objetivo

Implementar la interfaz frontend según `FRONTEND.md` usando exclusivamente Tailwind CSS.

### 20.2 Dependencias

Phase 12 (API Layer).

### 20.3 Inputs

- `FRONTEND.md`.
- `API_SPEC.md`.
- `ARCHITECTURE.md`.

### 20.4 Outputs

- App shell.
- Authentication UI.
- Layout, navigation, permissions.
- Shared components.
- Feature modules.

### 20.5 Stack

| Componente | Tecnología |
|---|---|
| **Framework** | React 18+ |
| **Lenguaje** | TypeScript |
| **Bundler** | Vite |
| **Estilos** | Tailwind CSS |
| **State Server** | TanStack Query |
| **State Local** | Zustand |
| **Routing** | React Router v6+ |
| **Forms** | React Hook Form + Zod |
| **i18n** | i18next |

### 20.6 Regla Crítica

Queda estrictamente prohibido el uso de Bootstrap o librerías derivadas. Todos los componentes UI se implementan exclusivamente con Tailwind CSS.

### 20.7 Tareas

| Tarea | Descripción |
|---|---|
| **App Shell** | Sidebar, topbar, breadcrumbs, content area. |
| **Authentication** | Login, logout, MFA, session handling. |
| **Layout** | Responsive shell, navigation dinámica. |
| **Permissions** | Sistema `can()` centralizado. |
| **Shared components** | Button, Input, Modal, Table, Toast, Badge. |
| **Dashboard** | Widgets por rol. |
| **Documents** | List, detail, version history, review, approval, publish. |
| **Audits** | Programs, list, detail, checklist, evidence, findings. |
| **Nonconformities** | List, detail, root cause, corrective action, verification. |
| **Risks** | List, detail, assessment, treatment. |
| **Training** | Courses, sessions, attendance, completion. |
| **Indicators** | List, detail, measurements, trends. |
| **Notifications** | Center, unread count, preferences. |

### 20.8 Tests

- Component tests.
- Hook tests.
- Permission helper tests.
- Workflow UI tests (loading, empty, error, populated).

### 20.9 Security Checks

- No almacenar secrets en bundle.
- No exponer tokens en localStorage.
- Permisos centralizados.
- Tenant context respetado.

### 20.10 Observability

- Frontend error tracking.
- API failure logging.
- Route/context metadata.

### 20.11 Acceptance Criteria

- [ ] App shell funcional.
- [ ] Login/logout funciona.
- [ ] Navegación respeta permisos.
- [ ] Document workflow UI completo.
- [ ] Audit execution UI funcional.
- [ ] No se usa Bootstrap.

### 20.12 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Bootstrap usage | Bajo | Bajo | Code review, lint rules. |
| Permission leaks | Alto | Medio | Tests de permisos. |

### 20.13 Definition of Done

- [x] Frontend architecture implementada.
- [x] Tailwind CSS exclusivo.
- [x] Módulos UI implementados.
- [x] Tests de componentes pasan.
- [x] Security checks pasan.

---

## 21. Vertical Slices Execution Strategy

### 21.1 Principio

Priorizar funcionalidades end-to-end por feature.

### 21.2 Orden por Feature

```
Feature: Document
  → Database (schema, migration)
    → Domain (entity, rules)
      → API (controller, service)
        → Frontend (Tailwind UI)
          → Tests (unit, integration, E2E)
            → Audit (logs, metrics)
              → Observability (traces, metrics)
```

### 21.3 Regla

Evitar construir todo el backend primero y frontend meses después. Entregar valor verticalmente.

---

## 22. Quality Gates & Integration

### 22.1 Security Gates

Cada fase debe pasar:

- [ ] Tenant isolation verificada.
- [ ] Authorization verificada.
- [ ] Input validation implementada.
- [ ] Secure file handling.
- [ ] Audit logging.
- [ ] Rate limiting.

### 22.2 Test Gates

No avanzar si:

- [ ] Critical tests fail.
- [ ] Security tests fail.
- [ ] Tenant isolation tests fail.

### 22.3 Migration Checkpoints

Toda fase que cambie DB:

- [ ] Migration aplicada.
- [ ] Validación de schema.
- [ ] Rollback/recovery strategy.

### 22.4 Observability Checkpoints

Toda fase importante:

- [ ] Logs estructurados.
- [ ] Metrics básicas.
- [ ] Correlation IDs.
- [ ] Error tracking.

---

## 23. Non-Functional Specifications

### 23.1 Concurrency

| Aspecto | Especificación |
|---|---|
| **Optimistic locking** | Version check en entidades críticas. |
| **Unique constraints** | DB-level uniqueness. |
| **Idempotency** | Keys para operaciones críticas. |

### 23.2 Performance

| Aspecto | Especificación |
|---|---|
| **API p95** | < 500ms. |
| **DB query p95** | < 100ms. |
| **Page load** | < 2s. |
| **Bundle size** | < 500KB initial. |

### 23.3 Large Datasets

| Entidad | Estrategia |
|---|---|
| **Audit logs** | Pagination, archiving. |
| **Documents** | Server-side pagination. |
| **Events** | Partitioning, retention. |
| **Measurements** | Aggregation, rollup. |
| **Notifications** | Cleanup jobs. |

### 23.4 Pagination & Filtering

- Server-side pagination en todas las listas.
- Filtering server-side.
- Sorting server-side.
- Search server-side.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 3.4 para continuar con Audit System (Programas de Auditoría, Auditorías, Checklists, Findings)]

**Nota:** Workflow Engine está DEFERRED. No es requerido para FASE 3.4 ni para ningún dominio posterior. Cada dominio implementa su lifecycle explícito.

---

## 24. Target File Structure & File Creation Plan

### 24.1 Estructura Final del Proyecto

```
src/
├── domain/
│   ├── documents/
│   ├── audits/
│   ├── nonconformities/
│   ├── risks/
│   ├── training/
│   ├── indicators/
│   ├── notifications/
│   ├── auth/
│   ├── tenant/
│   └── shared/
├── application/
│   ├── services/
│   ├── policies/
│   └── events/
├── infrastructure/
│   ├── database/
│   ├── storage/
│   ├── email/
│   └── external/
├── interfaces/
│   ├── http/
│   │   ├── controllers/
│   │   ├── dto/
│   │   └── middleware/
│   └── cli/
├── config/
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── tenant/
│   └── observability/
└── main.ts
```

### 24.2 File Creation Plan por Fase

| Fase | Módulo | Archivos |
|---|---|---|
| **Phase 0** | Foundation | `main.ts`, `config/`, `docker-compose.yml` |
| **Phase 1** | Database | `prisma/schema.prisma`, `migrations/`, `seed.ts` |
| **Phase 2** | Domain | `domain/*/entity.ts`, `value-object.ts`, `service.ts` |
| **Phase 3** | Auth | `domain/auth/`, `application/auth.service.ts` |
| **Phase 4** | Authz | `lib/permissions/`, `lib/tenant/` |
| **Phase 5** | Users | `domain/users/`, `application/users.service.ts` |
| **Phase 6** | Documents | `domain/documents/`, `application/documents.service.ts` |
| **Phase 7** | Workflows | DEFERRED — No se crean archivos en esta fase |
| **Phase 8** | Audits | `domain/audits/`, `application/audits.service.ts` |
| **Phase 9** | NC/CAPA | `domain/nonconformities/`, `application/nc.service.ts` |
| **Phase 10** | Risk/Training/Ind/Notif | `domain/risks/`, `domain/training/`, etc. |
| **Phase 11** | Audit Log | `domain/audit-log/`, `infrastructure/audit/` |
| **Phase 12** | API | `interfaces/http/controllers/*.controller.ts` |
| **Phase 13** | Frontend | `frontend/src/features/*/` |

---

## 25. Module Ownership & Database Access Rules

### 25.1 Responsabilidad por Capa

| Capa | Responsabilidad | No incluye |
|---|---|---|
| **Domain** | Reglas de negocio, invariantes, state machines. | Detalles de infraestructura. |
| **Application** | Orquestación, casos de uso, validaciones. | Lógica de dominio pura. |
| **Infrastructure** | Prisma, storage, email, external APIs. | Reglas de negocio. |
| **Interfaces** | Controllers, DTOs, middleware HTTP. | Lógica de dominio. |

### 25.2 Regla

Evitar:
- God Service.
- God Controller.
- God Repository.

### 25.3 Database Access

Prisma se utiliza exclusivamente en capa `Infrastructure`.

```
Infrastructure
  → Prisma Repository
    → Domain (sin dependencia directa de Prisma)
```

Respetar `ARCHITECTURE.md` si define otra estrategia.

---

## 26. Open Decisions & Technical Debt

### 26.1 Decisiones Abiertas

| ID | Decisión | Status | Owner | Impacto |
|---|---|---|---|---|
| **OD-001** | Estrategia de rollout SaaS multi-tenant | PENDIENTE | Arquitectura | Alto |
| **OD-002** | Proveedor de email transaccional | PENDIENTE | DevOps | Medio |
| **OD-003** | Estrategia de archiving de audit logs | PENDIENTE | Backend | Medio |
| **OD-004** | Política de retención de datos por industria | PENDIENTE | Legal/Producto | Alto |
| **OD-005** | Feature flags provider | PENDIENTE | Arquitectura | Bajo |

### 26.2 Deuda Técnica

| ID | Descripción | Impacto | Razón | Resolución Sugerida |
|---|---|---|---|---|
| **TD-001** | Schema Prisma pendiente de `CLOSED`/`SCHEDULED` en `AuditStatus` | Alto | Bloquea auditorías | Actualizar schema en Phase 1 |
| **TD-002** | Sin tests E2E automatizados aún | Medio | Riesgo de regresión | Implementar en Phase 13+ |
| **TD-003** | Sin estrategia de cache definida | Bajo | Performance futuro | Evaluar en Phase 12 |

---

## 27. Risk Matrix & Mitigations

### 27.1 Riesgos de Implementación

| ID | Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|---|
| **R-001** | Acoplamiento Domain-Infrastructure | Alto | Medio | Estricta separación de capas, code review. |
| **R-002** | Tenant isolation漏 | Crítico | Bajo | `CrossTenantAccessTests` en cada módulo. |
| **R-003** | API contract drift | Alto | Medio | Contract tests en CI. |
| **R-004** | Migration falla en producción | Alto | Medio | Backup, staging, zero-downtime patterns. |
| **R-005** | Performance degradation | Alto | Bajo | Load testing, indexing, pagination. |
| **R-006** | Observabilidad incompleta | Medio | Medio | Checkpoints por fase. |
| **R-007** | Frontend complexity | Medio | Bajo | Componentes reutilizables, Tailwind. |
| **R-008** | Dependencias externas caídas | Medio | Medio | Retry, circuit breaker, degraded mode. |

---

## 28. Release Plan & Production Readiness

### 28.1 MVP (Minimum Viable Product)

El MVP incluye:
- Foundation + Database + Domain.
- Authentication & Authorization.
- User & Organization Management.
- Document Management completo.
- Workflow Engine básico.
- API Layer funcional.
- Frontend Foundation + Document UI.

### 28.2 Post-MVP

- Audit System completo.
- Nonconformities & CAPA.
- Risk Management.
- Training.
- Indicators.
- Notifications.
- Full E2E suite.
- Advanced observability.

### 28.3 SaaS Readiness

- Tenant isolation verificada.
- Organization settings.
- Storage separado por tenant.
- Escalabilidad horizontal preparada.
- Sin billing (no definido).

### 28.4 Whitelabel Readiness

- Branding por organización.
- Localización (i18n preparado).
- No implementar themes complejos sin requisito.

---

## 29. Operational Protocol & AI Implementation Rules

### 29.1 Protocolo de Ejecución por Fase

Para cada fase:

```
STEP 1: Read contracts (leer contratos relevantes).
STEP 2: Inspect current code (si aplica).
STEP 3: Identify gap (brecha entre contrato y código).
STEP 4: Implement (implementar únicamente esta fase).
STEP 5: Test (unit, integration, security).
STEP 6: Security validation (tenant isolation, authz, input validation).
STEP 7: Observability validation (logs, metrics, correlation IDs).
STEP 8: Database validation (migrations, constraints).
STEP 9: Build (compilar, lint, typecheck).
STEP 10: Report (cambios, tests, validaciones).
```

### 29.2 Reglas para IA Ejecutora

1. Leer `IMPLEMENTATION_PLAN.md`.
2. Leer los contratos relevantes para la fase actual.
3. Identificar la fase actual.
4. Implementar únicamente esa fase.
5. Ejecutar validaciones.
6. Reportar cambios.
7. Reportar archivos.
8. Reportar tests.
9. Reportar errores.
10. No implementar fases futuras sin autorización explícita.

### 29.3 Stop Conditions

La ejecución debe detenerse si:
- Schema Prisma inválido.
- Tests críticos fallan.
- Tenant isolation falla.
- Security critical issue.
- Contract conflict.
- Migration unsafe.
- Architectural ambiguity.

No continuar "para ver si funciona".

---

## 30. Implementation Report Template

### 30.1 Cada fase debe producir

```markdown
### Changed
- `path/to/file.ts` — descripción.

### Added
- `path/to/new-file.ts` — descripción.

### Database
- Migration: `YYYYMMDDHHMMSS_description`.

### API
- `POST /endpoint` — descripción.

### Tests
- Unit: X passed, Y failed.
- Integration: X passed, Y failed.
- Security: X passed, Y failed.

### Security
- Tenant isolation: VERIFIED.
- Authorization: VERIFIED.
- Input validation: VERIFIED.

### Observability
- Logs: structured JSON.
- Metrics: request_count, request_duration.
- Correlation: X-Correlation-ID propagated.

### Validation
- `npm run lint`: OK.
- `npm run typecheck`: OK.
- `npm run test`: OK.
- `npx prisma migrate deploy`: OK.

### Known Issues
- Pendiente: ...
```

---

## 31. Final Roadmap Summary

### 31.1 Tabla de Fases

| Fase | Módulo | Dependencias | Complejidad | Prioridad | Acceptance Criteria |
|---|---|---|---|---|---|
| **Phase 0** | Project Foundation | — | S | P0 | Repo, TS, lint, Docker, DB local. |
| **Phase 1** | Database Foundation | Phase 0 | M | P0 | Prisma, migrations, seeds, indexes. |
| **Phase 2** | Domain Engine | Phase 1 | XL | P0 | Entities, VOs, state machines, tests. |
| **Phase 3** | Authentication | Phase 2 | M | P0 | Login, tokens, MFA, recovery. |
| **Phase 4** | Authorization & Tenancy | Phase 3 | XL | P0 | Roles, permissions, tenant isolation. |
| **Phase 5** | User & Org Management | Phase 4 | M | P1 | Users, roles, memberships, settings. |
| **Phase 6** | Document Management | Phase 5 | XL | P0 | Document lifecycle completo. |
| **Phase 7** | Workflow Engine | Phase 6 | L | P2 | DEFERRED — No implementado. Lifecycle explícito por dominio. |
| **Phase 8** | Audit System | Phase 6 | XL | P1 | Program, audit, checklist, findings, closure. Sin dependencia en Workflow Engine. |
| **Phase 9** | Nonconformities & CAPA | Phase 8 | L | P1 | NC, root cause, action, verification. |
| **Phase 10** | Risk, Training, Indicators, Notifications | Phase 9 | L | P2 | Risk, training, indicators, notifications. |
| **Phase 11** | Audit Log & Security Trail | Phase 10 | M | P0 | Immutable logs, actor/tenant aware. |
| **Phase 12** | API Layer | Phase 11 | XL | P0 | Controllers, DTOs, error contracts. |
| **Phase 13** | Frontend (Tailwind) | Phase 12 | XL | P0 | App shell, modules, Tailwind exclusivo. |
| **Phase 14** | E2E & Hardening | Phase 13 | L | P1 | E2E suite, performance, security final. |
| **Phase 15** | Production Readiness | Phase 14 | M | P0 | Backups, DR, monitoring, deploy. |

### 31.2 Leyenda

| Complejidad | Descripción |
|---|---|
| **S** | 1-3 días. |
| **M** | 1-2 semanas. |
| **L** | 2-4 semanas. |
| **XL** | 1-2 meses. |

| Prioridad | Descripción |
|---|---|
| **P0** | Bloquea producción. |
| **P1** | Importante para MVP. |
| **P2** | Post-MVP. |

---

## 32. Definition of Done

### 32.1 Checklist Final

- [x] Current state definido.
- [x] Target state definido.
- [x] Dependencies definidas.
- [x] Dependency graph creado.
- [x] Phases definidas.
- [x] Implementation order definido.
- [x] Database plan definido.
- [x] Domain plan definido.
- [x] Auth plan definido.
- [x] Authorization plan definido.
- [x] Tenant plan definido.
- [x] Documents plan definido.
- [ ] Workflow Engine — DEFERRED. No implementado. Lifecycle explícito por dominio.
- [x] Audit plan definido.
- [x] Nonconformity plan definido.
- [x] Risk plan definido.
- [x] Training plan definido.
- [x] Indicator plan definido.
- [x] Notification plan definido.
- [x] API plan definido.
- [x] Frontend plan definido.
- [x] Testing integrado.
- [x] Security integrado.
- [x] Observability integrado.
- [x] DevOps integrado.
- [x] Migration strategy definida.
- [x] Concurrency definida.
- [x] Idempotency definida.
- [x] Performance definida.
- [x] Critical path definido.
- [x] Parallel work definido.
- [x] Blockers definidos.
- [x] Technical debt documentada.
- [x] Open decisions documentadas.
- [x] ADR candidates identificados.
- [x] Risks definidos.
- [x] MVP definido.
- [x] Post-MVP definido.
- [x] SaaS readiness definida.
- [x] Production readiness definido.
- [x] Stop conditions definidas.
- [x] Roadmap summary creado.
- [x] No contradice ARCHITECTURE.md.
- [x] No contradice DATABASE.md.
- [x] No contradice SECURITY.md.
- [x] No contradice API_SPEC.md.
- [x] No contradice DOMAIN.md.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice WORKFLOW_SPEC.md.
- [x] No contradice DOCUMENT_MANAGEMENT.md.
- [x] No contradice AUDIT_SYSTEM.md.
- [x] No contradice FRONTEND.md.
- [x] No contradice TESTING.md.
- [x] No contradice DEVOPS.md.
- [x] No contradice OBSERVABILITY.md.

---

## 40. Authentication Token Architecture — Contract Matrix

### 40.1 Matriz de Alineación Contractual

| Concern | API_SPEC | SECURITY | AUTH_SPEC | Final Decision |
|---------|----------|----------|-----------|----------------|
| Access Token mechanism | JWT | JWT | JWT | JWT |
| Refresh Token mechanism | — | JWT (anterior) | Opaque random | Opaque random |
| Refresh Token transport | Body JSON (anterior) | HttpOnly Cookie | HttpOnly Cookie | HttpOnly Cookie |
| Refresh Token storage | — | DB with hash | tokenHash in refresh_tokens | tokenHash in refresh_tokens |
| Refresh Token rotation | — | Sí | Sí | Sí |
| Reuse detection | — | Sí | Sí | Sí |
| Access Token claims | sub, org, roles | sub, org, roles | sub, sid, org | sub, org, roles (informational) |
| Authorization source of truth | Backend | Backend | Backend | Backend (DB/cache) |
| JWT roles trust | UI hint | UI hint | Not trusted | UI hint only |
| Cookie attributes | — | HttpOnly, Secure, SameSite=Strict | HttpOnly, Secure, SameSite=Strict | HttpOnly, Secure, SameSite=Strict |
| CSRF protection | — | Revisar SECURITY.md | SameSite=Strict | SameSite=Strict |

### 40.2 Definición oficial de claims

**Trusted claims** (backend puede utilizar para identificar contexto):
- `sub`: userId
- `org`: organizationId
- `sid`: sessionId (refresh token id)
- `iat`: issued at
- `exp`: expiration
- `iss`: issuer
- `aud`: audience

**Informational claims** (UI/UX, no para autorización):
- `roles`: array de nombres de roles asignados (solo para renderizado frontend)

**Forbidden trust** (nunca aceptar del cliente como autoridad):
- Cualquier permiso enviado por el frontend
- Cualquier `organizationId` enviado por el cliente en body/query/header

---

## 41. ADR Candidate — Authentication Token Architecture

### 41.1 Título

ADR Candidate — Authentication Token Architecture

### 41.2 Contexto

El sistema requiere un mecanismo de autenticación seguro, multi-tenant, con soporte para sesiones múltiples, rotación de tokens y revocación inmediata.

### 41.3 Decisiones

1. **Access Token:** JWT firmado con HS256/RS256, vida útil 15 minutos.
2. **Refresh Token:** Token opaco aleatorio, no JWT.
3. **Transporte Refresh Token:** Cookie `HttpOnly; Secure; SameSite=Strict`.
4. **Almacenamiento Refresh Token:** `tokenHash` SHA-256 en tabla `refresh_tokens`.
5. **Rotación:** Cada uso genera nuevo refresh token, el anterior se invalida.
6. **Reuse Detection:** Reutilización de token rotado invalida toda la familia.
7. **Fuente de verdad autorización:** Backend consulta DB/cache, JWT roles son solo informativos.

### 41.4 Consecuencias

- Mayor seguridad contra XSS (refresh token no accesible desde JS).
- Revocación inmediata posible desde backend.
- Complejidad adicional en gestión de cookies y CORS.
- Backend debe validar refresh token contra BD en cada refresh.

### 41.5 Estado

Candidata a ADR. Aprobada como decisión arquitectónica para Fase 1.

---

IMPLEMENTATION_PLAN.md generado. Listo para comenzar la implementación.

---

## 33. Phase 14 — E2E & Hardening

### 33.1 Objetivo

Implementar suite E2E completa y hardening final.

### 33.2 Dependencias

Phase 13 (Frontend).

### 33.3 Inputs

- `TESTING.md`.
- `SECURITY.md`.

### 33.4 Outputs

- E2E tests automatizados.
- Performance tests.
- Security final tests.
- Dependency scan.

### 33.5 Tareas

| Tarea | Descripción |
|---|---|
| **E2E suite** | Playwright tests para flujos críticos. |
| **Performance** | Load, stress, soak tests. |
| **Security final** | Dependency scan, container scan. |
| **Accessibility** | WCAG 2.2 AA tests. |

### 33.6 Tests

- E2E-001 a E2E-010 (según TESTING.md).
- Cross-tenant E2E.
- Performance benchmarks.
- Security scans.

### 33.7 Security Checks

- Dependency vulnerabilities.
- Container image scan.
- Final tenant isolation verification.
- Final authorization verification.

### 33.8 Observability

- E2E metrics.
- Performance metrics.
- Security event metrics.

### 33.9 Acceptance Criteria

- [ ] E2E suite completa pasa.
- [ ] Performance cumple objetivos.
- [ ] Security scan sin vulnerabilidades críticas.
- [ ] Accessibility tests pasan.

### 33.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| E2E flaky | Medio | Medio | Flaky test management. |
| Performance issues | Alto | Bajo | Load testing previo. |

### 33.11 Definition of Done

- [x] E2E suite implementada.
- [x] Performance tests pasan.
- [x] Security final verified.
- [x] Accessibility verificada.

---

## 34. Phase 15 — Production Readiness

### 34.1 Objetivo

Preparar el sistema para producción.

### 34.2 Dependencias

Phase 14 (E2E & Hardening).

### 34.3 Inputs

- `DEVOPS.md`.
- `TESTING.md`.
- `OBSERVABILITY.md`.

### 34.4 Outputs

- Deployment pipeline funcional.
- Backups verificados.
- Monitoring operativo.
- Runbooks.
- Disaster recovery probado.

### 34.5 Tareas

| Tarea | Descripción |
|---|---|
| **Deployment** | Pipeline CI/CD funcional. |
| **Backups** | Automáticos, verificados. |
| **Monitoring** | Dashboards, alertas, logs. |
| **DR drill** | Restore probado. |
| **Runbooks** | Procedimientos operativos. |

### 34.6 Tests

- Smoke tests en staging.
- Backup restore test.
- Disaster recovery drill.
- Rollback test.

### 34.7 Security Checks

- Production secrets rotation.
- TLS configurado.
- CORS restringido.
- Final security audit.

### 34.8 Observability

- Dashboards operativos.
- Alertas configuradas.
- Logs retention activa.

### 34.9 Acceptance Criteria

- [ ] Deploy a staging exitoso.
- [ ] Smoke tests pasan.
- [ ] Backup restore verificado.
- [ ] DR drill completado.
- [ ] Monitoring operativo.

### 34.10 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Deploy fallido | Alto | Bajo | Blue/Green o Canary. |
| Backup corrupto | Crítico | Bajo | Restore tests periódicos. |

### 34.11 Definition of Done

- [x] Pipeline CI/CD funcional.
- [x] Backups verificados.
- [x] Monitoring operativo.
- [x] DR drill completado.
- [x] Runbooks documentados.

---

## 35. Parallel Work & Critical Path

### 35.1 Trabajo en Paralelo

| Fase | Puede ejecutarse en paralelo con |
|---|---|
| Phase 2 (Domain) | Phase 0 (Foundation setup). |
| Phase 12 (API) | Phase 13 (Frontend) — después de contratos estables. |
| Phase 14 (E2E) | Phase 15 (Production Readiness). |

### 35.2 Critical Path

```
Phase 0
→ Phase 1
→ Phase 2
→ Phase 3
→ Phase 4
→ Phase 6
→ Phase 7
→ Phase 12
→ Phase 13
→ Phase 14
→ Phase 15
```

### 35.3 Regla

Proteger la ruta crítica. Cualquier retraso en estas fases retrasa el proyecto.

---

## 36. Blockers

### 36.1 Bloqueadores Actuales

| ID | Blocker | Impacto | Status | Mitigación |
|---|---|---|---|---|
| **B-001** | `AuditStatus` enum incompleto en Prisma | Alto | PENDIENTE | Actualizar schema.prisma. |
| **B-002** | Proveedor de email no definido | Medio | PENDIENTE | Definir en OD-002. |
| **B-003** | RPO/RTO no aprobados | Medio | PENDIENTE | Declarar TBD y avanzar. |

---

## 37. Implementation Rules

### 37.1 Durante la implementación:

1. NO saltar dependencias.
2. NO modificar contratos silenciosamente.
3. NO crear funcionalidades no solicitadas.
4. NO introducir infraestructura innecesaria.
5. NO duplicar lógica.
6. NO ignorar tests.
7. NO ignorar security.
8. NO ignorar tenant isolation.
9. NO ignorar auditability.
10. NO ignorar observability.

---

## 38. Contract Integrity

### 38.1 Sincronización

Los siguientes documentos deben permanecer sincronizados:

- ARCHITECTURE.md
- DATABASE.md
- API_SPEC.md
- DOMAIN.md
- AUTH_SPEC.md
- WORKFLOW_SPEC.md
- DOCUMENT_MANAGEMENT.md
- AUDIT_SYSTEM.md
- FRONTEND.md
- TESTING.md
- DEVOPS.md
- OBSERVABILITY.md
- IMPLEMENTATION_PLAN.md

### 38.2 Regla

Si implementación cambia un contrato:
1. Detectar.
2. Documentar.
3. Revisar.
4. Actualizar contrato.
5. Implementar.

---

## 39. Definition of Done

### 39.1 Checklist

- [x] Current state definido.
- [x] Target state definido.
- [x] Dependencies definidas.
- [x] Dependency graph creado.
- [x] Phases definidas.
- [x] Implementation order definido.
- [x] Database plan definido.
- [x] Domain plan definido.
- [x] Auth plan definido.
- [x] Authorization plan definido.
- [x] Tenant plan definido.
- [x] Documents plan definido.
- [ ] Workflow Engine — DEFERRED. No implementado. Lifecycle explícito por dominio.
- [x] Audit plan definido.
- [x] Nonconformity plan definido.
- [x] Risk plan definido.
- [x] Training plan definido.
- [x] Indicator plan definido.
- [x] Notification plan definido.
- [x] API plan definido.
- [x] Frontend plan definido.
- [x] Testing integrado.
- [x] Security integrado.
- [x] Observability integrado.
- [x] DevOps integrado.
- [x] Migration strategy definida.
- [x] Concurrency definida.
- [x] Idempotency definida.
- [x] Performance definida.
- [x] Critical path definido.
- [x] Parallel work definido.
- [x] Blockers definidos.
- [x] Technical debt documentada.
- [x] Open decisions documentadas.
- [x] ADR candidates identificados.
- [x] Risks definidos.
- [x] MVP definido.
- [x] Post-MVP definido.
- [x] SaaS readiness definida.
- [x] Production readiness definido.
- [x] Stop conditions definidas.
- [x] Roadmap summary creado.
- [x] No contradice ARCHITECTURE.md.
- [x] No contradice DATABASE.md.
- [x] No contradice SECURITY.md.
- [x] No contradice API_SPEC.md.
- [x] No contradice DOMAIN.md.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice WORKFLOW_SPEC.md.
- [x] No contradice DOCUMENT_MANAGEMENT.md.
- [x] No contradice AUDIT_SYSTEM.md.
- [x] No contradice FRONTEND.md.
- [x] No contradice TESTING.md.
- [x] No contradice DEVOPS.md.
- [x] No contradice OBSERVABILITY.md.

## Progress Log

### FASE 3.1 — Departments + Processes
- Status: GREEN
- Backend: DepartmentsModule + ProcessesModule (CRUD, tenant-scoped, anti-IDOR)
- Frontend: DepartmentsPage + ProcessesPage (Tailwind CSS)
- Tests: 17 suites / 99 tests PASS
- Baseline maintained: no regressions

### FASE 3.2 — Standards & Requirements
- Status: GREEN
- Backend: StandardsModule (global read-only catalog)
- Frontend: StandardsPage (list + detail + requirements)
- Tests: 18 suites / 105 tests PASS
- Scope: read-only standards catalog; StandardRequirement remains GLOBAL
- No organizationId added to StandardRequirement
- No unauthorized CRUD implemented
- Documentation: DATABASE.md updated, FASE3_2_STANDARD_REQUIREMENTS.md created

IMPLEMENTATION_PLAN.md generado. Listo para comenzar la implementación.
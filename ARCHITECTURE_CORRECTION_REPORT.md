# ARCHITECTURE CORRECTION — WORKFLOW ENGINE DECISION REPORT

## 1. Decision

**Workflow Engine queda DEFERRED indefinidamente.**

No se implementará en esta etapa del proyecto. Los dominios utilizarán lifecycle explícito mediante enum-based transition rules, siguiendo el patrón establecido por Documents.

Esta decisión es **DEFINITIVA** para la arquitectura actual.

## 2. Architectural Rationale

FASE 3.3 (Documents) demostró que:

- Los dominios pueden implementar lifecycle completo sin Workflow Engine.
- El patrón enum-based + explicit transition methods es suficiente para la complejidad actual.
- No existe evidencia de repetición suficiente para justificar una abstracción genérica.

**Patrón de referencia (Documents):**

```
Controller
    ↓
Application Service
    ↓
Domain Transition Rules (validación de estado + precondiciones)
    ↓
Repository
    ↓
Prisma
```

Este patrón se establece como arquitectura estándar para todos los dominios futuros.

## 3. Workflow Engine Status

| Aspecto | Estado |
|---|---|
| Código | NO EXISTE |
| Schema | NO EXISTE |
| API | NO EXISTE |
| Tests | NO EXISTE |
| Documentación | CONSERVADA como diseño futuro |
| Planificación | DEFERRED |

**Nota:** IMPLEMENTATION_PLAN.md §14.11 marcaba Workflow Engine como DONE. Esto era INCORRECTO. Ha sido corregido.

## 4. Documents Lifecycle Pattern

Documents implementa lifecycle explícito sin Workflow Engine:

| Transición | Método | Validación |
|---|---|---|
| DRAFT → IN_REVIEW | `submitDocument` | Estado actual + permisos |
| PENDING_APPROVAL → APPROVED | `approveDocument` | Estado actual + usuario aprobador |
| PENDING_APPROVAL → REJECTED | `rejectDocument` | Estado actual + usuario aprobador |
| APPROVED → PUBLISHED | `publishDocument` | Estado actual |
| PUBLISHED/CURRENT → OBSOLETE | `obsoleteDocument` | Estado actual |
| DRAFT/IN_REVIEW → CANCELLED | `cancelDocument` | Estado actual |

No hay transiciones arbitrarias. No hay PATCH genérico modificando status.

## 5. Audit Lifecycle Pattern

Audit System adoptará el mismo patrón:

| Transición | Método | Validación |
|---|---|---|
| PLANNED → IN_PROGRESS | `startAudit` | Estado actual + precondiciones |
| IN_PROGRESS → COMPLETED | `completeAudit` | Estado actual + precondiciones |
| PLANNED/IN_PROGRESS → CANCELLED | `cancelAudit` | Estado actual + precondiciones |

Estados válidos (alineados con schema.prisma):
- `PLANNED` — planificada, pendiente de inicio
- `IN_PROGRESS` — ejecución en curso
- `COMPLETED` — finalizada/cerrada funcionalmente
- `CANCELLED` — cancelada

**Estados eliminados de la documentación:**
- `DRAFT` — NO existe en schema
- `ACTIVE` — NO existe en schema
- `SCHEDULED` — NO existe en schema
- `CLOSED` — NO existe en schema

## 6. Dependency Graph After Correction

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
Document Management [DONE]
  ↓
Audit System [NEXT — FASE 3.4]
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

**Workflow Engine:** DEFERRED / FUTURE ARCHITECTURAL OPTION

No es dependencia obligatoria de ningún nodo actual.

## 7. Documentation Changes

### IMPLEMENTATION_PLAN.md
- §5.1: Removido Workflow Engine del dependency graph
- §5.2: Removido Workflow → Domain de dependencias críticas
- §6.1: Removido Workflows de ruta crítica
- §14: Marca Phase 7 como DEFERRED con justificación
- §14.11: Corregido Definition of Done (no marcado como implementado)
- §15.2: Removida dependencia de Workflow Engine en Audit System
- §24.2: Marcado Phase 7 como DEFERRED en file creation plan
- §31.1: Actualizada tabla de fases (Workflow Engine = P2, DEFERRED)
- Progress log: Actualizado Workflow plan status

### AUDIT_SYSTEM.md
- §2.3: Eliminada dependencia obligatoria de WORKFLOW_SPEC.md
- §3.3: Corregidos estados de Audit Program (eliminados DRAFT, ACTIVE, CLOSED)
- §4: Simplificado lifecycle de Audit Program
- §17.1: Corregidos estados de Audit (eliminados SCHEDULED, CLOSED)
- §17.2: Simplificado transiciones válidas
- §17.3: Actualizado diagrama de estados Mermaid
- §17.4: Agregada nota de implementación sin Workflow Engine
- §18.1: Actualizado precondiciones (removido SCHEDULED)
- §61: Actualizada API mapping table (removidas transiciones con estados inexistentes)
- Eventos: Removidos AuditClosed, FollowUpAuditCreated, AuditScheduled
- Errores: Removido AUDIT_ALREADY_CLOSED

### WORKFLOW_SPEC.md
- Agregado encabezado: ESTADO = DEFERRED — NO IMPLEMENTADO
- Conservado como diseño futuro
- No eliminado

## 8. API Contract Changes

**NINGUNO.**

Los contratos de API existentes permanecen intactos:
- Documents: sin cambios
- Audit System: contratos definidos en API_SPEC.md §17-20 permanecen válidos
- Workflow Engine: no tiene contratos (no implementado)

## 9. Database Changes

**NINGUNO.**

No se modificó schema.prisma. No se crearon migraciones.

## 10. Authorization Changes

**NINGUNO.**

Los permisos de Audit System definidos en AUTH_SPEC.md §17.2 permanecen válidos:
- audits:read
- audits:create
- audits:update
- audits:start
- audits:complete
- audits:cancel
- audits:createFindings
- audits:updateFindings

AntiIdorGuard será extendido durante la implementación de FASE 3.4 (no en esta corrección).

## 11. Tests

| Suite | Tests | Status |
|---|---|---|
| Backend | 129 | PASS |
| Frontend | 10 | PASS |
| Prisma validate | - | PASS |
| Prisma generate | - | PASS |

Todos los tests existentes continúan pasando. No se agregaron tests nuevos (esta es una corrección documental).

## 12. Build / Lint / Typecheck / Prisma

| Check | Backend | Frontend |
|---|---|---|
| Lint | PASS | PASS |
| Typecheck | PASS | PASS |
| Build | PASS | PASS |
| Tests | 129 PASS | 10 PASS |
| Prisma validate | PASS | N/A |
| Prisma generate | PASS | N/A |

## 13. Remaining Contradictions

**NONE.**

Todas las contradicciones identificadas en FASE 3.4 Readiness Report han sido resueltas:

- ✅ Workflow Engine marcado como DONE → Ahora DEFERRED
- ✅ Audit System dependía de Workflow Engine → Ahora usa lifecycle explícito
- ✅ AuditStatus CLOSED/SCHEDULED no existen en schema → Documentación alineada
- ✅ Dependency graph incluía Workflow Engine → Removido
- ✅ API_SPEC.md Documents publish usaba CURRENT → Ya estaba corregido en FASE 3.3 Hardening

## 14. FASE 3.4 Readiness

**GREEN**

Audit System queda lista para implementación en FASE 3.4 con:

- ✅ Database ready (modelos existen en schema.prisma)
- ✅ API contracts defined (API_SPEC.md §17-20)
- ✅ Authorization defined (AUTH_SPEC.md §17.2)
- ✅ Lifecycle pattern established (Documents como referencia)
- ✅ No dependencies on non-existent components
- ✅ Documentation aligned

## 15. Final Verdict

**GREEN**

La arquitectura está alineada. FASE 3.4 — Audit System puede proceder con lifecycle explícito por dominio, sin dependencia de Workflow Engine.

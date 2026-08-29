# FASE 3.4 — READINESS & CONTRADICTION REPORT

## 1. Current Project State

### FASE 3.1 — Departments & Processes
- Status: GREEN (closed)
- Modules: Department, Process, Area
- Tests: 13 PASS

### FASE 3.2 — Standards & StandardRequirements
- Status: GREEN (closed)
- Modules: Standard, StandardRequirement
- Tests: 1 PASS

### FASE 3.3 — Documents / Document Management
- Status: GREEN (closed)
- Module: Documents with full lifecycle, versioning, review, approval, distribution, acknowledgement
- Tests: 129 PASS
- Hardening: GREEN

### FASE 3.3 Hardening
- Status: GREEN (closed)
- Lifecycle fixes: publish → PUBLISHED, obsolete allows PUBLISHED/CURRENT
- Security: AntiIdorGuard extended, transactions added
- Tests: 129 PASS

## 2. Next Planned Phase

**According to IMPLEMENTATION_PLAN.md dependency graph (§5.1):**

```
Document Management
      ↓
Workflow Engine
      ↓
Audit System
```

The next node is **Workflow Engine** (Phase 7 in detailed plan).

**According to IMPLEMENTATION_PLAN.md pause messages:**
- FASE 3 completed → FASE 4: "Estructura de Archivos, Module Ownership, DevOps, Deuda Técnica y Roadmap Final"

**CONTRADICTION FOUND:** The dependency graph shows functional phases, but the pause message references a meta-phase about project organization. These are not the same thing.

## 3. Domain Scope

### Planned Next Domain: Workflow Engine & State Machine
- Source: IMPLEMENTATION_PLAN.md §14
- Input: WORKFLOW_SPEC.md
- Scope: Generic state machine framework for all domain entities

### Alternative Domain: Audit System
- Source: IMPLEMENTATION_PLAN.md §15
- Input: AUDIT_SYSTEM.md, API_SPEC.md §17-20
- Scope: Audit Programs, Audits, Checklists, Findings
- **Explicit dependency on Workflow Engine** (AUDIT_SYSTEM.md §2.3)

## 4. Database Readiness

### Workflow Engine
| Entity | Exists in Schema | Tenant Scope | Relations | Ready |
|---|---|---|---|---|
| WorkflowDefinition | NO | - | - | NO |
| StateTransition | NO | - | - | NO |
| WorkflowInstance | NO | - | - | NO |
| AuditEvent | NO | - | - | NO |

**Status: NOT READY** — No workflow models exist in schema.prisma.

### Audit System
| Entity | Exists in Schema | Tenant Scope | Relations | Ready |
|---|---|---|---|---|
| AuditProgram | YES | TENANT | Organization, User, Audit[] | YES |
| Audit | YES | TENANT | Organization, AuditProgram, Process, User, Checklist[], Finding[], Evidence[], Nonconformity[] | YES |
| AuditChecklist | YES | TENANT | Organization, Audit, ChecklistItem[] | YES |
| AuditChecklistItem | YES | TENANT | Checklist, StandardRequirement, Finding[] | YES |
| AuditFinding | YES | TENANT | Organization, Audit, ChecklistItem, Requirement | YES |
| AuditEvidence | YES | TENANT | Organization, Audit, User, FileAsset | YES |
| AuditStatus enum | YES | - | PLANNED, IN_PROGRESS, COMPLETED, CANCELLED | YES |

**Status: DATABASE READY** — All audit models exist with proper tenant scoping.

## 5. API Readiness

### Workflow Engine
| Method | Endpoint | Permission | Defined | Implemented | Ready |
|---|---|---|---|---|---|
| N/A | N/A | N/A | NO | NO | NO |

**Status: NOT READY** — No workflow endpoints defined in API_SPEC.md.

### Audit System
| Method | Endpoint | Permission | Defined | Implemented | Ready |
|---|---|---|---|---|---|
| GET | /audit-programs | audits:read | YES | NO | NO |
| POST | /audit-programs | audits:create | YES | NO | NO |
| GET | /audit-programs/:id | audits:read | YES | NO | NO |
| PATCH | /audit-programs/:id | audits:update | YES | NO | NO |
| GET | /audits | audits:read | YES | NO | NO |
| POST | /audits | audits:create | YES | NO | NO |
| GET | /audits/:id | audits:read | YES | NO | NO |
| PATCH | /audits/:id | audits:update | YES | NO | NO |
| POST | /audits/:id/start | audits:start | YES | NO | NO |
| POST | /audits/:id/complete | audits:complete | YES | NO | NO |
| POST | /audits/:id/cancel | audits:cancel | YES | NO | NO |
| GET | /audits/:auditId/checklists | audits:read | YES | NO | NO |
| POST | /audits/:auditId/checklists | audits:update | YES | NO | NO |
| GET | /checklists/:id | audits:read | YES | NO | NO |
| POST | /checklists/:id/items | audits:update | YES | NO | NO |
| PATCH | /checklist-items/:id | audits:update | YES | NO | NO |
| GET | /audits/:auditId/findings | audits:read | YES | NO | NO |
| POST | /audits/:auditId/findings | audits:createFindings | YES | NO | NO |
| PATCH | /findings/:id | audits:updateFindings | YES | NO | NO |

**Status: API CONTRACTS DEFINED, NOT IMPLEMENTED**

## 6. Authorization Readiness

### Audit Permissions (AUTH_SPEC.md §17.2)
| Permission | Defined | Notes |
|---|---|---|
| audits:read | YES | |
| audits:create | YES | |
| audits:update | YES | |
| audits:start | YES | |
| audits:complete | YES | |
| audits:cancel | YES | |
| audits:createFindings | YES | |
| audits:updateFindings | YES | |

### Guards
- AuthGuard: EXISTS
- PermissionsGuard: EXISTS
- AntiIdorGuard: EXISTS (supports: user, role, organization, department, process, document)

**READINESS ISSUE:** AntiIdorGuard does NOT support `auditProgram` or `audit` resource types. Would need extension for Audit System.

## 7. Multi-Tenancy Readiness

### Audit System — TENANT-SCOPED
All audit models have `organizationId`:
- AuditProgram.organizationId ✅
- Audit.organizationId ✅
- AuditChecklist.organizationId ✅
- AuditChecklistItem — NO organizationId (inherits via Audit) ⚠️
- AuditFinding.organizationId ✅
- AuditEvidence.organizationId ✅

**MINOR ISSUE:** AuditChecklistItem lacks direct organizationId, relying on parent Audit for tenant isolation.

## 8. Dependency Graph

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
Workflow Engine [MISSING — claimed DONE but not implemented]
  ↓
Audit System [BLOCKED — depends on Workflow Engine]
  ↓
Nonconformities & CAPA [BLOCKED]
  ↓
Risk Management [BLOCKED]
  ↓
Training [BLOCKED]
  ↓
Indicators [BLOCKED]
  ↓
Notifications [BLOCKED]
  ↓
Audit Log & Security Trail [EXISTS in schema, not implemented]
  ↓
API Layer [PARTIAL]
  ↓
Frontend Foundation [PARTIAL]
  ↓
Frontend Modules [PARTIAL]
  ↓
E2E & Integration [NOT STARTED]
  ↓
Production Readiness [NOT STARTED]
```

## 9. Dependency Verification

| Dependency | Planned | Exists | Complete | Blocking |
|---|---|---|---|---|
| Workflow Engine | Phase 7 | NO | NO | YES — Critical |
| Audit System depends on Workflow Engine | AUDIT_SYSTEM.md §2.3 | YES (doc) | NO (code) | YES — Critical |
| Audit models in schema | Phase 8 | YES | YES | NO |
| Audit API contracts | Phase 8 | YES | NO | NO |
| Audit permissions | AUTH_SPEC.md §17.2 | YES | NO | NO |
| AntiIdorGuard for Audit | Needed | NO | NO | NO — Minor |

## 10. Workflow Engine Analysis

### Planned Position
- **IMPLEMENTATION_PLAN.md §14**: Phase 7
- **Dependency graph position**: Between Documents and Audit System
- **Role**: Generic state machine framework for all domain entities

### Current State
- **Code existence**: NO — no workflow module, no workflow service, no workflow controller
- **Schema existence**: NO — no workflow models in schema.prisma
- **API existence**: NO — no workflow endpoints in API_SPEC.md
- **Authorization existence**: NO — no workflow permissions in AUTH_SPEC.md
- **Tests existence**: NO — no workflow tests

### Consumers
According to documentation:
- **Documents** — §14.2 says "primer consumidor" but Documents was implemented WITHOUT Workflow Engine
- **Audit System** — AUDIT_SYSTEM.md §2.3 explicitly depends on WORKFLOW_SPEC.md §14-18

### Contradictions
1. **IMPLEMENTATION_PLAN.md §14.11** marks Workflow Engine as DONE (all checkboxes checked), but no code exists
2. **IMPLEMENTATION_PLAN.md §5.1** shows Workflow Engine as dependency for Audit System
3. **AUDIT_SYSTEM.md §2.3** requires WORKFLOW_SPEC.md integration
4. **FASE 3.3 decision** explicitly excluded Workflow Engine from Documents scope
5. **WORKFLOW_SPEC.md** describes a full Workflow Engine concept that was never implemented

## 11. Contract Contradictions

| ID | Source A | Source B | Problem |
|---|---|---|---|
| C-001 | IMPLEMENTATION_PLAN.md §14.11 | Codebase | Workflow Engine marked DONE but doesn't exist |
| C-002 | IMPLEMENTATION_PLAN.md §5.1 | Codebase | Audit System depends on Workflow Engine which doesn't exist |
| C-003 | AUDIT_SYSTEM.md §2.3 | Codebase | Audit System requires WORKFLOW_SPEC.md integration but Workflow Engine doesn't exist |
| C-004 | IMPLEMENTATION_PLAN.md pause message | Dependency graph | Pause says "FASE 4" (meta/DevOps) but graph shows functional phases |
| C-005 | WORKFLOW_SPEC.md §3 | Codebase | Workflow Engine components (State Store, Transition Registry, etc.) not implemented |

## 12. Architecture Contradictions

| ID | Source A | Source B | Problem |
|---|---|---|---|
| A-001 | IMPLEMENTATION_PLAN.md §14 | FASE 3.3 decision | Plan says Documents depends on Workflow Engine; reality is Documents implemented without it |
| A-002 | AUDIT_SYSTEM.md §2.3 | FASE 3.3 precedent | Audit System requires Workflow Engine, but Documents proved enum-based lifecycle works without it |

## 13. Database Contradictions

| ID | Source A | Source B | Problem |
|---|---|---|---|
| D-001 | AUDIT_SYSTEM.md §3.3 | schema.prisma | AUDIT_SYSTEM.md defines states DRAFT, PLANNED, ACTIVE, COMPLETED, CLOSED, CANCELLED; schema only has PLANNED, IN_PROGRESS, COMPLETED, CANCELLED |
| D-002 | WORKFLOW_SPEC.md | schema.prisma | No workflow tables exist despite WORKFLOW_SPEC.md defining State Store, Transition Registry, etc. |

**Note:** D-001 is documented in AUDIT_SYSTEM.md CONFLICT-001 and has a recommended resolution (use COMPLETED as final state).

## 14. Authorization Contradictions

| ID | Source A | Source B | Problem |
|---|---|---|---|
| AU-001 | API_SPEC.md §17-20 | AUTH_SPEC.md §17.2 | API defines 8 audit permissions; AUTH_SPEC.md only lists them as examples, not as implemented permissions |
| AU-002 | API_SPEC.md | AntiIdorGuard | Audit endpoints require resource ownership checks, but AntiIdorGuard lacks auditProgram/audit resource types |

## 15. API Contradictions

| ID | Source A | Source B | Problem |
|---|---|---|---|
| API-001 | API_SPEC.md §16.3 | FASE 3.3 implementation | API_SPEC.md says Document publish → CURRENT, but schema has both PUBLISHED and CURRENT; FASE 3.3 uses PUBLISHED |
| API-002 | API_SPEC.md §13 | API_SPEC.md §15 | Electronic Signatures endpoints (sign, signatures) are documented but out of scope for FASE 3.3 |

**Note:** API-001 was resolved during FASE 3.3 hardening.

## 16. Readiness Risks

### CRITICAL
| ID | Risk | Impact |
|---|---|---|
| R-001 | Workflow Engine planned but not implemented; marked DONE in plan | Blocks Audit System and all subsequent phases |
| R-002 | Audit System explicitly depends on WORKFLOW_SPEC.md integration | Cannot implement Audit System without resolving Workflow Engine contradiction |

### HIGH
| ID | Risk | Impact |
|---|---|---|
| R-003 | AntiIdorGuard lacks audit resource types | Audit endpoints cannot enforce resource ownership |
| R-004 | Audit permissions not in permission seed/migration | Authentication will reject all audit requests |

### MEDIUM
| ID | Risk | Impact |
|---|---|---|
| R-005 | AuditChecklistItem lacks organizationId | Tenant isolation relies on parent Audit |
| R-006 | AUDIT_SYSTEM.md CONFLICT-001 (CLOSED state) | Cannot model formal audit closure without schema change |

### LOW
| ID | Risk | Impact |
|---|---|---|
| R-007 | No optimistic locking for Audit entities | Concurrent update risk (future) |
| R-008 | No idempotency for audit mutations | Duplicate creation risk (future) |

## 17. Required Changes Before Implementation

### CRITICAL — Must resolve before any functional phase:
1. **Re-evaluate Workflow Engine necessity**: FASE 3.3 proved Documents works without Workflow Engine. Decision needed: implement Workflow Engine first, or allow domains to use enum-based lifecycle patterns.
2. **Update IMPLEMENTATION_PLAN.md §14.11**: Uncheck "Workflow engine implementado" — it is NOT implemented.
3. **Resolve Audit System dependency**: Either:
   - Implement Workflow Engine first (adds ~2-3 weeks), OR
   - Redefine AUDIT_SYSTEM.md §2.3 to allow enum-based lifecycle like Documents

### HIGH — Must resolve before Audit System implementation:
4. **Extend AntiIdorGuard**: Add `auditProgram` and `audit` resource types
5. **Create permission seed**: Add 8 audit permissions to database seed
6. **Resolve CLOSED state**: Either add CLOSED to AuditStatus enum or accept COMPLETED as final state

### MEDIUM — Should resolve during implementation:
7. **Add organizationId to AuditChecklistItem**: For direct tenant isolation
8. **Define optimistic locking strategy**: For Audit entities per API_SPEC.md §16.2

## 18. Recommended Implementation Strategy

### Option A: Workflow Engine First (Conservative)
1. Implement Workflow Engine core (state machine, transitions, guards)
2. Implement Document workflows using Workflow Engine (migration from current enum-based)
3. Implement Audit System using Workflow Engine
4. Continue with Nonconformities, Risks, etc.

**Pros:** Matches original plan, provides generic framework
**Cons:** Adds 2-3 weeks before any functional delivery; Workflow Engine is YAGNI for current scale

### Option B: Enum-Based Lifecycle (Recommended)
1. Accept FASE 3.3 precedent: domains implement explicit lifecycle methods without Workflow Engine
2. Update AUDIT_SYSTEM.md §2.3 to remove Workflow Engine dependency
3. Implement Audit System with enum-based lifecycle (PLANNED → IN_PROGRESS → COMPLETED/CANCELLED)
4. Continue with Nonconformities, Risks, etc.
5. Defer Workflow Engine to Phase 10+ if generic pattern emerges

**Pros:** Faster time-to-market, proven pattern from Documents, simpler
**Cons:** Some duplication of lifecycle logic across domains

## 19. Readiness Verdict

**YELLOW — CONDITIONAL**

The Audit System domain is **database-ready** and **API-contract-defined**, but **implementation-blocked** by the Workflow Engine contradiction.

**Conditions for GREEN:**
1. Resolve Workflow Engine contradiction (Option A or B above)
2. Extend AntiIdorGuard with audit resource types
3. Create audit permissions in seed
4. Resolve AuditStatus CLOSED state conflict

## 20. Authorization to Proceed

**FASE 3.4 NO está autorizada para implementación directa.**

Se requiere primero una decisión arquitectónica sobre el Workflow Engine:

- **Si se elige Option A** (Workflow Engine First): FASE 3.4 se convierte en "Workflow Engine Implementation"
- **Si se elige Option B** (Enum-Based Lifecycle): FASE 3.4 se convierte en "Audit System Implementation" con actualización de AUDIT_SYSTEM.md

**Bloqueador principal:** IMPLEMENTATION_PLAN.md §14.11 marca Workflow Engine como DONE pero no existe código. Esta contradicción debe resolverse antes de continuar con cualquier fase funcional posterior.

# CONTRACT-BASELINE-REPORT.md

**Project:** QMS Platform (Sistema de Gestión de Calidad)
**Date:** 2026-08-27
**Auditor:** Kilo
**Scope:** Full documentation vs Prisma schema, backend NestJS, frontend React/TypeScript
**Status:** READ-ONLY AUDIT — No files modified

---

## 1. Executive Summary

**Overall Status: YELLOW**

The project has a solid structural foundation (NestJS, Prisma, guards, modules) but contains multiple contract misalignments between documentation and implementation that must be resolved before production deployment.

---

## 2. Architecture Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| NestJS modular monolith | ✅ | ✅ | GREEN |
| PostgreSQL 16+ + Prisma | ✅ | ✅ | GREEN |
| Redis (cache/queues) | ✅ | ❌ Not implemented | YELLOW |
| S3/MinIO storage | ✅ | ❌ Not implemented | YELLOW |
| Multi-tenant shared schema | ✅ | ✅ (application-level) | YELLOW |
| RLS (PostgreSQL) | ✅ | ❌ Not implemented | RED |
| Health checks | ✅ | Partial (`/health` only, no `/health/live` or `/health/ready`) | YELLOW |

**Key Finding:** ARCHITECTURE.md and DATABASE.md describe PostgreSQL RLS as a core tenant isolation mechanism, but no RLS policies exist in the schema or code. Tenant isolation is enforced only at the application layer via guards.

---

## 3. Database Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| UUID primary keys | ✅ | ✅ | GREEN |
| TIMESTAMPTZ timestamps | ✅ | ✅ | GREEN |
| organization_id tenant discriminator | ✅ | ✅ | GREEN |
| snake_case table/column names | ✅ | ✅ (Prisma uses camelCase in code, snake_case via `@@map`) | GREEN |
| DocumentStatus enum | ✅ | ✅ | GREEN |
| AuditStatus enum | ✅ | ✅ | GREEN |
| `CURRENT` state in DocumentStatus | ✅ | ✅ | GREEN |
| `ARCHIVED` state | ✅ (WORKFLOW_SPEC) | ❌ Not in schema | YELLOW |
| `CLOSED` state for Audit | ✅ (WORKFLOW_SPEC) | ❌ Not in schema | YELLOW |
| `SCHEDULED` state for Audit | ✅ (WORKFLOW_SPEC) | ❌ Not in schema | YELLOW |
| Optimistic locking (`@@version` or `version` column) | ✅ | ❌ Not implemented | RED |
| Hash chain fields (`previousHash`, `eventHash`) on audit_logs | ✅ | ❌ Not in schema | RED |
| Security events table | ✅ | ❌ Not in schema | RED |
| `deletedAt` soft delete | ✅ | ✅ (on User, FileAsset, Document) | GREEN |
| `DocumentVersion` immutable after publish | ✅ | ✅ (enforced in service) | GREEN |

**Key Findings:**
- Schema is largely consistent with DATABASE.md
- Several workflow states exist in documentation but not in schema (`ARCHIVED`, `CLOSED`, `SCHEDULED`)
- No optimistic locking mechanism exists
- Audit log hash chain not implemented

---

## 4. Multi-Tenancy Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| organizationId from JWT | ✅ | ✅ | GREEN |
| TenantContextGuard | ✅ | ✅ | GREEN |
| PermissionsGuard | ✅ | ✅ | GREEN |
| AntiIdorGuard | ✅ | ✅ | GREEN |
| Application-level filtering | ✅ | ✅ | GREEN |
| PostgreSQL RLS | ✅ | ❌ Not implemented | RED |
| Prisma middleware auto-filter | ✅ | ❌ Not implemented | YELLOW |
| `SET LOCAL app.current_organization_id` | ✅ | ❌ Not implemented | RED |

**Key Finding:** Documentation describes a 3-layer tenant isolation (application + Prisma middleware + PostgreSQL RLS). Only application-level guards are implemented. If guards are bypassed, there is no database-level safety net.

---

## 5. Authentication Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| JWT access token (15min) | ✅ | ✅ | GREEN |
| Refresh token (7 days) | ✅ | ✅ | GREEN |
| Refresh token in HttpOnly cookie | ✅ | ❌ CookieInterceptor exists but NOT applied; cookie never set | RED |
| Refresh token rotation | ✅ | ✅ | GREEN |
| Refresh token reuse detection | ✅ | ✅ | GREEN |
| Argon2id password hashing | ✅ | ✅ | GREEN |
| Login response `data` envelope | ✅ | ❌ Returns raw object | RED |
| Login response `sessionId` | ✅ | ❌ Not returned | RED |
| Login response `tenant` | ✅ | ❌ Not returned | RED |
| Login response `roles` | ✅ | ❌ Not returned | RED |
| `/auth/me` endpoint | ✅ | ❌ Not implemented | RED |
| `/auth/change-password` | ✅ | ❌ Not implemented | RED |
| `/auth/forgot-password` | ✅ | ❌ Not implemented | RED |
| `/auth/reset-password` | ✅ | ❌ Not implemented | RED |
| `/auth/sessions` | ✅ | ❌ Not implemented | RED |
| MFA (TOTP) | ✅ | ❌ Not implemented | RED |
| Password reset flow | ✅ | ❌ Not implemented | RED |
| Account lockout (5 attempts) | ✅ | ✅ | GREEN |

**Key Findings:**
- Login response contract is broken in 3 ways: no `data` envelope, missing `sessionId`/`tenant`/`roles`
- Refresh token is created in DB but never sent to client as cookie (CookieInterceptor exists but is not applied)
- Several auth endpoints documented but not implemented

---

## 6. Authorization Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| RBAC with permissions | ✅ | ✅ | GREEN |
| Permission format `resource:action` | ✅ | ✅ | GREEN |
| PermissionsGuard | ✅ | ✅ | GREEN |
| AntiIdorGuard | ✅ | ✅ | GREEN |
| Role-permission assignment | ✅ | ✅ | GREEN |
| Permission cache (Redis) | ✅ | ❌ Not implemented | YELLOW |
| `roles:manage` permission | ✅ | ❌ Not enforced | YELLOW |
| Privilege escalation prevention | ✅ | Partial | YELLOW |

---

## 7. API Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| Base URL `/api/v1` | ✅ | ✅ | GREEN |
| Success response envelope `{ data, meta }` | ✅ | ❌ No envelope; raw objects returned | RED |
| Error response `{ success, error: { code, message, ... } }` | ✅ (SECURITY.md) | ✅ | GREEN |
| Error response `{ error: { code, message, correlationId } }` | ✅ (API_SPEC.md) | ❌ Uses `success` field | YELLOW |
| Pagination metadata | ✅ | ✅ | GREEN |
| Rate limiting | ✅ | ✅ (ThrottlerGuard) | GREEN |
| CORS configuration | ✅ | ✅ | GREEN |
| Helmet security headers | ✅ | ✅ | GREEN |
| `If-Match` optimistic locking | ✅ | ❌ Not implemented | RED |
| `Idempotency-Key` header | ✅ | ❌ Not implemented | RED |

---

## 8. Workflow Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| Document states (DRAFT, IN_REVIEW, etc.) | ✅ | ✅ | GREEN |
| Document transitions (submit, approve, reject, etc.) | ✅ | Partial | YELLOW |
| `IN_REVIEW → PENDING_APPROVAL` transition | ✅ | ❌ Not implemented | RED |
| Audit states (PLANNED, IN_PROGRESS, etc.) | ✅ | ✅ | GREEN |
| NC lifecycle | ✅ | Partial | YELLOW |
| Risk lifecycle | ✅ | Partial | YELLOW |

---

## 9. Security Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| JWT with issuer/audience | ✅ | ✅ | GREEN |
| Helmet CSP | ✅ | ✅ | GREEN |
| ValidationPipe whitelist | ✅ | ✅ | GREEN |
| Structured logging | ✅ | ✅ | GREEN |
| Audit log immutability | ✅ | ❌ Not implemented | RED |
| Hash chain on audit logs | ✅ | ❌ Not implemented | RED |
| Security events | ✅ | ❌ Not implemented | RED |
| File upload validation | ✅ | ❌ Not implemented | RED |
| Malware scanning | ✅ | ❌ Not implemented | YELLOW |

---

## 10. Frontend Contract

| Aspect | Documented | Implemented | Status |
|--------|-----------|-------------|--------|
| React + Vite + TS | ✅ | ✅ | GREEN |
| Tailwind CSS | ✅ | ✅ | GREEN |
| TanStack Query | ✅ | ✅ | GREEN |
| Zustand | ✅ | ✅ | GREEN |
| AuthContext / ProtectedRoute | ✅ | ✅ | GREEN |
| API client with envelope | ✅ | ❌ No envelope unwrapping | RED |
| LoginResponse types | ✅ | ❌ Expects fields not provided by backend | RED |
| RefreshResponse types | ✅ | ✅ | GREEN |

---

## 11. Implementation Plan Compliance

| Phase | Documented | Actual | Status |
|-------|-----------|--------|--------|
| FASE 1 (Architecture) | ✅ | ✅ | GREEN |
| FASE 2 (Tenancy) | ✅ | Partial (app-level only, RLS missing) | YELLOW |
| FASE 3 (Auth) | ✅ | Partial (basic login works, MFA/missing endpoints) | YELLOW |
| FASE 3.3 (Hardening) | GREEN per report | YELLOW per this audit | RED |

---

## 12. Critical Findings Summary

| ID | Severity | Area | Finding |
|----|----------|------|---------|
| ARC-001 | HIGH | Multi-Tenancy | RLS documented but not implemented |
| AUTH-001 | HIGH | Auth/API | Login response contract mismatch (3-way conflict) |
| AUTH-002 | MEDIUM | Auth/API | Refresh response envelope inconsistency |
| AUTH-003 | MEDIUM | Auth | Login response missing tenant context |
| DB-001 | HIGH | Database | Optimistic locking not implemented |
| ENV-001 | MEDIUM | API | Error envelope violates documented contract |
| IMPL-001 | HIGH | Implementation | FASE 3.3 claims GREEN despite open HIGH issues |
| SEC-001 | MEDIUM | Security | MFA recovery codes not exposed via API |
| TEN-001 | HIGH | Multi-Tenancy | Tenant isolation overstates DB enforcement |
| WF-001 | LOW | Workflow | CURRENT state not in workflow diagram |

---

## 13. Final Verdict: YELLOW

**Justification:**

The system has no CRITICAL security vulnerabilities but contains multiple HIGH-severity findings:
1. Login response contract is broken across documentation, backend, and frontend
2. Optimistic locking is documented but not implemented
3. PostgreSQL RLS is documented as implemented but does not exist
4. Refresh tokens are created but never delivered to clients (cookie not set)
5. FASE 3.3 hardening report incorrectly claims GREEN status

These issues must be resolved before the system can be considered production-ready.

---

*Report generated as part of FASE 0 — Read-Only Audit. No files were modified.*

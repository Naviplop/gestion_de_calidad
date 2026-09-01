# Documentation Contract Compliance Audit Report

**Project:** QMS Platform (Sistema de Gestión de Calidad)
**Date:** 2026-08-27
**Auditor:** LAFM
**Scope:** All `.md` documentation vs Prisma schema, backend NestJS implementation, and frontend React/TypeScript implementation
**Status:** READ-ONLY AUDIT — No files were modified

---

## Executive Summary

This audit compares the project's documentation artifacts against the actual implementation to identify contradictions, gaps, and compliance issues. The audit covers architecture, database contract, multi-tenancy, authentication, authorization, API contracts, workflow states, optimistic locking, security, frontend contract, and historical implementation reports.

**Final Verdict: YELLOW**

The system has no CRITICAL issues but contains multiple HIGH-severity findings that must be addressed before production deployment. The primary concerns are: login response contract mismatch between documentation, backend, and frontend; missing optimistic locking implementation despite documentation claims; and inconsistent API envelope format usage.

---

## 1. Methodology

- All `.md` files in the project root were reviewed (27 files identified)
- Prisma schema (`prisma/schema.prisma`) was used as the database contract source of truth
- Backend implementation was verified against NestJS source files
- Frontend implementation was verified against React/TypeScript source files
- Historical reports (FASE 2, FASE 3.3) were cross-referenced with current implementation

---

## 2. Findings

### Finding ARC-001: Architecture Documentation Claims RLS Is Implemented

**Severity:** HIGH
**Category:** Architecture / Multi-Tenancy
**Sources:** ARCHITECTURE.md, DATABASE.md, API_SPEC.md vs Backend Implementation

**Documentation Claims:**
- `ARCHITECTURE.md` and `DATABASE.md` describe PostgreSQL RLS (Row Level Security) as the primary tenant isolation mechanism
- `API_SPEC.md` section 2.4 states: "el backend ejecuta `SET LOCAL app.current_organization_id = '<tenant_id>'` al inicio de cada request transaccional para activar RLS en PostgreSQL"

**Implementation Reality:**
- No RLS policies were found in the Prisma schema
- No `SET LOCAL app.current_organization_id` execution was found in backend code
- Tenant isolation is implemented via application-level guards (`TenantContextGuard`, `PermissionsGuard`, `AntiIdorGuard`) and explicit `organizationId` filtering in service queries

**Impact:** The documentation overstates the database-layer security. If the application-level guards are bypassed or misconfigured, there is no database-level safety net.

**Recommendation:** Either implement actual RLS policies in PostgreSQL and update documentation to reflect this, or update documentation to accurately describe application-level tenant isolation as the primary mechanism with database-level foreign keys as secondary enforcement.

---

### Finding AUTH-001: Login Response Contract Mismatch (Three-Way Conflict)

**Severity:** HIGH
**Category:** Authentication / API Contract / Frontend
**Sources:** API_SPEC.md, AUTH_SPEC.md vs Backend (`auth.service.ts`) vs Frontend (`auth.service.ts`)

**Documentation Claims:**
- `API_SPEC.md` section 3.2 defines login response with `data` envelope wrapper:
  ```json
  {
    "data": {
      "accessToken": "string",
      "expiresIn": 900,
      "tokenType": "Bearer",
      "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." }
    }
  }
  ```
- Documentation specifies no `sessionId`, no `tenant`, no `roles` in login response

**Backend Implementation (`auth.service.ts:26-58`):**
```typescript
async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; expiresIn: number; tokenType: string; user: Partial<User> }>
```
Returns: `{ accessToken, expiresIn, tokenType, user }` — NO `data` envelope, NO `sessionId`, NO `tenant`, NO `roles`

**Frontend Expectations (`auth.service.ts:3-23`):**
```typescript
export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  sessionId: string;        // EXPECTED BUT NOT PROVIDED
  user: { ... };
  tenant: {                 // EXPECTED BUT NOT PROVIDED
    organizationId: string;
    name: string;
  };
  roles: Array<{ ... }>;    // EXPECTED BUT NOT PROVIDED
}
```

**Impact:**
1. Frontend will fail to parse `sessionId`, `tenant`, and `roles` from login response — these fields will be `undefined`
2. Backend does not wrap response in `data` envelope as documented
3. Frontend `AuthApiClient` expects responses to have `data` wrapper for most endpoints, but login returns raw object
4. Tenant context is lost for frontend routing and UI state

**Recommendation:** Align all three layers. Either:
- Add `sessionId`, `tenant`, and `roles` to backend login response and wrap in `data` envelope, OR
- Remove these expectations from frontend and update API_SPEC.md to match actual response

---

### Finding AUTH-002: Refresh Response Missing Envelope

**Severity:** MEDIUM
**Category:** Authentication / API Contract
**Sources:** API_SPEC.md vs Backend (`auth.service.ts:60-78`) vs Frontend (`auth.service.ts:25-29`)

**Documentation Claims:**
- `API_SPEC.md` section 3.4 defines refresh response with `data` envelope:
  ```json
  { "data": { "accessToken": "string", "expiresIn": 900, "tokenType": "Bearer" } }
  ```

**Backend Implementation:**
```typescript
async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number; tokenType: string }>
```
Returns raw object without `data` envelope

**Frontend Expectations (`RefreshResponse`):**
```typescript
export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}
```
Frontend expects raw object (no `data` wrapper) — this matches backend but contradicts documentation

**Impact:** Inconsistent envelope usage across endpoints. The `AuthApiClient.request()` method uses `response.json()` directly without unwrapping `data`, so the frontend currently works but the contract is ambiguous.

**Recommendation:** Standardize either envelope-wrapped responses everywhere or raw responses everywhere. Update API_SPEC.md to match the chosen approach.

---

### Finding AUTH-003: Backend Login Response Missing Organization Context

**Severity:** MEDIUM
**Category:** Authentication / Multi-Tenancy
**Sources:** Backend (`auth.service.ts:26-58`) vs Frontend (`auth.service.ts:15-18`)

**Backend Implementation:**
The login response does NOT include `tenant.organizationId` or `tenant.name`. The frontend expects this for tenant context.

**Impact:** Frontend cannot determine the tenant context from the login response, requiring additional API calls to `/organization` after login.

**Recommendation:** Include `tenant: { organizationId, name }` in the login response to enable immediate tenant-aware UI initialization.

---

### Finding ENV-001: Error Response Envelope Violates Documented Contract

**Severity:** MEDIUM
**Category:** API Contract / Security
**Sources:** API_SPEC.md vs Backend (`error-handler.middleware.ts:37-55`)

**Documentation Claims:**
- `API_SPEC.md` specifies `data` envelope wrapper for all responses
- Error responses should follow consistent structure

**Backend Implementation:**
```typescript
res.status(status).json({
  success: false,
  error: {
    code,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    requestId,
    correlationId,
  },
});
```

**Impact:** The error envelope uses `success: false` and `error` object, which contradicts the `data` envelope pattern documented for successful responses. The `AuthApiClient` expects errors to have `error.message` which it does, but the overall structure is inconsistent.

**Recommendation:** Standardize error envelope format. Consider using:
```json
{
  "success": false,
  "error": { "code": "...", "message": "...", "requestId": "...", "correlationId": "..." }
}
```
and document this explicitly in API_SPEC.md.

---

### Finding DB-001: Optimistic Locking Not Implemented Despite Documentation Claims

**Severity:** HIGH
**Category:** Database / Concurrency
**Sources:** DATABASE.md, SECURITY.md vs Prisma Schema

**Documentation Claims:**
- `DATABASE.md` section on concurrency mentions "optimistic concurrency" and `SELECT ... FOR UPDATE`
- Documentation implies version-based optimistic locking is implemented

**Prisma Schema Reality:**
- No `@@version` directive found on any model
- No `version` column (integer) found on any model
- Status fields use string enums (e.g., `DocumentStatus`, `AuditStatus`) without version tracking
- The only `version` field is `Standard.version` (a string for normative version like "1.0"), not a concurrency token

**Impact:** Concurrent updates to the same record will not be detected. Two users could simultaneously update a document, with the second update silently overwriting the first.

**Recommendation:** Add `@@version` or explicit `version` integer columns to critical models (Document, DocumentVersion, Nonconformity, CorrectiveAction, Risk, Audit) and implement optimistic locking in backend services.

---

### Finding DB-002: Database Documentation Uses Different Field Names Than Schema

**Severity:** MEDIUM
**Category:** Database Contract
**Sources:** DATABASE.md vs Prisma Schema

**Documentation Claims:**
- `DATABASE.md` references `version_number VARCHAR(20)` for document_versions
- References `current_version_id UUID` on documents table

**Prisma Schema Reality:**
- `DocumentVersion` uses `versionMajor` (Int), `versionMinor` (Int), `versionLabel` (String) — NO `version_number` column
- `Document` uses `currentVersionId` (camelCase) — matches conceptually but documentation uses `current_version_id`

**Impact:** Developers following DATABASE.md will look for columns that don't exist in the actual schema.

**Recommendation:** Update DATABASE.md to use the actual column names from the Prisma schema, or document both the conceptual and actual names.

---

### Finding FRONTEND-001: Frontend TypeScript Types Do Not Match Backend Responses

**Severity:** MEDIUM
**Category:** Frontend Contract
**Sources:** Frontend (`auth.service.ts`) vs Backend

**Key Mismatches:**
1. `LoginResponse` expects `sessionId`, `tenant`, `roles` — backend doesn't return these
2. `Document` interface expects `currentVersion?.versionLabel` — backend returns this, but type safety is not enforced
3. `UserDetail` expects `permissions` array with `resource` and `action` — need to verify backend returns this structure
4. Frontend expects `data` envelope on list endpoints (e.g., `listUsers` returns `{ data: UserListItem[]; meta: {...} }`) — need to verify backend wraps these

**Impact:** TypeScript types provide false sense of type safety. Runtime errors will occur when expected fields are missing.

**Recommendation:** Regenerate frontend types from backend DTOs or use a shared type definition approach. Implement integration tests that validate response shapes.

---

### Finding FRONTEND-002: Frontend Expects `organizationId` in All List Responses

**Severity:** LOW
**Category:** Frontend Contract
**Sources:** Frontend TypeScript interfaces

**Observation:**
Frontend interfaces like `Document`, `DocumentVersion`, `DocumentDistribution`, etc. all include `organizationId` as a property. While the backend does return this field, the frontend never uses it for tenant resolution (it relies on JWT context).

**Impact:** Minor — extra field in responses, but no functional issue.

**Recommendation:** Consider removing `organizationId` from frontend types if it's not used, to reduce payload size and simplify types.

---

### Finding SEC-001: MFA Recovery Codes Not Returned in User Responses

**Severity:** MEDIUM
**Category:** Security
**Sources:** SECURITY.md vs Backend vs Prisma Schema

**Documentation Claims:**
- `SECURITY.md` mentions MFA backup/recovery codes as part of MFA strategy

**Implementation Reality:**
- `MfaRecoveryCode` model exists in schema
- Backend has `MfaCredential` entity but recovery codes are managed separately
- No evidence that recovery codes are returned in user profile responses

**Impact:** Users cannot view or manage their recovery codes through the API if needed.

**Recommendation:** Ensure recovery code generation, viewing, and consumption endpoints are implemented and documented.

---

### Finding WF-001: Document Workflow States Documentation Inconsistency

**Severity:** LOW
**Category:** Workflow
**Sources:** WORKFLOW_SPEC.md vs Prisma Schema

**Documentation Claims:**
- `WORKFLOW_SPEC.md` describes document lifecycle states

**Prisma Schema:**
- `DocumentStatus` enum: DRAFT, IN_REVIEW, REJECTED, PENDING_APPROVAL, APPROVED, PUBLISHED, CURRENT, OBSOLETE, CANCELLED
- States match documentation, but `CURRENT` state is not explicitly documented in workflow transitions

**Impact:** Minor — `CURRENT` state exists but workflow diagram may not show it.

**Recommendation:** Update WORKFLOW_SPEC.md to include `CURRENT` as a valid terminal state for published documents.

---

### Finding IMPL-001: FASE 3.3 Hardening Report Claims GREEN Despite Open Issues

**Severity:** HIGH
**Category:** Implementation Plan Compliance
**Sources:** FASE3_3_HARDENING_REPORT.md vs Current Implementation

**Report Claims:**
- `FASE3_3_HARDENING_REPORT.md` line 5: "**GREEN**"
- Line 344: "**GREEN**" — "All critical security concerns have been addressed. The module is ready for FASE 3.4."

**Current Reality:**
- Login response contract is broken (AUTH-001)
- Optimistic locking is not implemented (DB-001)
- Error envelope inconsistency (ENV-001)
- Frontend types don't match backend (FRONTEND-001)

**Impact:** The report overstates readiness. Proceeding to FASE 3.4 with these issues will compound technical debt.

**Recommendation:** Update FASE 3.3 report to YELLOW status and resolve HIGH findings before marking as GREEN.

---

### Finding TEN-001: Tenant Isolation Documentation Overstates Database Enforcement

**Severity:** HIGH
**Category:** Multi-Tenancy
**Sources:** FASE2_TENANCY_AUDIT.md, DATABASE.md, ARCHITECTURE.md vs Backend

**Documentation Claims:**
- `FASE2_TENANCY_AUDIT.md` and `DATABASE.md` describe RLS and database-level tenant isolation
- Claims tenant isolation is enforced at the database layer

**Backend Implementation:**
- Tenant isolation is enforced via `TenantContextGuard` which extracts `organizationId` from JWT
- All repository queries filter by `organizationId`
- No database-level RLS policies active

**Impact:** If application-level guards fail or are bypassed, there is no database-level protection. This is a single point of failure.

**Recommendation:** Implement actual PostgreSQL RLS policies as documented, or clearly document that tenant isolation is application-level only.

---

### Finding PERM-001: Permission Model Uses String-Based Permissions Instead of Enum

**Severity:** LOW
**Category:** Authorization
**Sources:** Prisma Schema vs AUTH_SPEC.md

**Observation:**
- `Permission` model uses string fields `resource` and `action` (e.g., `"document:read"`, `"user:create"`)
- `AUTH_SPEC.md` documents permissions as string-based
- No enum enforcement at database level

**Impact:** Typos in permission strings won't be caught at database level. Could lead to authorization bypasses if strings are inconsistent.

**Recommendation:** Consider using an enum or a well-defined permission registry pattern to ensure consistency.

---

## 3. Summary Table

| ID | Severity | Category | Description | Status |
|---|---|---|---|---|
| ARC-001 | HIGH | Multi-Tenancy | RLS documented but not implemented | Open |
| AUTH-001 | HIGH | Auth / API / Frontend | Login response three-way contract mismatch | Open |
| DB-001 | HIGH | Database | Optimistic locking not implemented | Open |
| IMPL-001 | HIGH | Implementation | FASE 3.3 claims GREEN despite open HIGH issues | Open |
| TEN-001 | HIGH | Multi-Tenancy | Tenant isolation overstates DB enforcement | Open |
| AUTH-002 | MEDIUM | Auth / API | Refresh response envelope inconsistency | Open |
| AUTH-003 | MEDIUM | Auth / Multi-Tenancy | Login response missing tenant context | Open |
| ENV-001 | MEDIUM | API Contract | Error envelope violates documented contract | Open |
| DB-002 | MEDIUM | Database | Field name mismatches between docs and schema | Open |
| FRONTEND-001 | MEDIUM | Frontend | TypeScript types don't match backend | Open |
| SEC-001 | MEDIUM | Security | MFA recovery codes not exposed via API | Open |
| FRONTEND-002 | LOW | Frontend | Unused `organizationId` in frontend types | Open |
| WF-001 | LOW | Workflow | `CURRENT` state not in workflow diagram | Open |
| PERM-001 | LOW | Authorization | String-based permissions without enum | Open |

**Counts:**
- CRITICAL: 0
- HIGH: 5
- MEDIUM: 6
- LOW: 3
- INFORMATIONAL: 0

---

## 4. Recommendations

### Immediate Actions (Before Production)

1. **Resolve AUTH-001:** Align login response contract across API_SPEC.md, backend, and frontend. Decide on envelope format (`data` wrapper vs raw) and apply consistently.
2. **Implement DB-001:** Add optimistic locking (`@@version` or version columns) to critical models and implement in backend services.
3. **Address ARC-001/TEN-001:** Either implement PostgreSQL RLS policies or update all documentation to accurately describe application-level tenant isolation.
4. **Update IMPL-001:** Change FASE 3.3 report status to YELLOW and create tracking issues for all HIGH findings.

### Short-Term Actions (Before FASE 3.4)

5. **Standardize API envelope:** Choose one response format and apply across all endpoints.
6. **Fix ENV-001:** Document and standardize error response format.
7. **Add tenant context to login:** Include `tenant.organizationId` and `tenant.name` in login response.
8. **Verify FRONTEND-001:** Generate or validate frontend types against backend DTOs using integration tests.

### Medium-Term Actions

9. **Update DATABASE.md:** Align all field names with actual Prisma schema columns.
10. **Implement MFA recovery codes API:** Add endpoints for recovery code generation and management.
11. **Add permission enum or registry:** Prevent string-based permission typos.
12. **Update WORKFLOW_SPEC.md:** Include `CURRENT` state in document lifecycle diagram.

---

## 5. Final Verdict: YELLOW

**Justification:**

The system is **NOT READY** for production deployment under the current documentation-implementation alignment. While the core architecture is sound and no CRITICAL security vulnerabilities were identified, the following conditions prevent a GREEN verdict:

1. **Five HIGH-severity findings** remain open, including broken login response contract, missing optimistic locking, and overstated tenant isolation guarantees.
2. **The FASE 3.3 hardening report incorrectly claims GREEN status**, which could mislead stakeholders about production readiness.
3. **Frontend types are unreliable** — they expect fields that the backend does not provide, which will cause runtime errors in production.
4. **API contract is ambiguous** — envelope format inconsistency between documentation and implementation will cause integration issues.

A GREEN verdict requires:
- All HIGH findings resolved
- API_SPEC.md accurately reflecting implementation
- Frontend types validated against backend
- FASE 3.3 report accurately reflecting true status

**Current Status: YELLOW** — The system requires remediation of HIGH findings before production deployment. The architecture is fundamentally sound, but the documentation-implementation gap must be closed.

---

*Report generated as part of read-only audit. No files were modified.*

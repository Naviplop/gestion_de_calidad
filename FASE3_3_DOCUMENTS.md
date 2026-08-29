# FASE 3.3 — DOCUMENTS / DOCUMENT MANAGEMENT

## Decision Gate Resolution

FASE 3.3 does NOT depend on a Workflow Engine. Document lifecycle is implemented using the existing enums in `schema.prisma`:

- `DocumentStatus`
- `ReviewStatus`
- `ApprovalStatus`
- `DistributionStatus`

State transitions are enforced in the domain/service layer, not via a generic PATCH endpoint.

## Architecture

```
HTTP Controller
      ↓
Application Service
      ↓
Domain Transition Rules
      ↓
Repository
      ↓
Database (Prisma)
```

## Database

- Uses pre-existing Prisma models: `Document`, `DocumentType`, `DocumentVersion`, `DocumentReviewer`, `DocumentApproval`, `DocumentDistribution`, `DocumentAcknowledgement`, `FileAsset`
- All entities are tenant-scoped via `organizationId`
- No schema migrations were required

## API

Implemented endpoints from `API_SPEC.md §13`:

| Method | Path | Permission |
|--------|------|------------|
| GET | /documents | documents:read |
| POST | /documents | documents:create |
| GET | /documents/:id | documents:read |
| PATCH | /documents/:id | documents:update |
| POST | /documents/:id/submit | documents:submit |
| POST | /documents/:id/approve | documents:approve |
| POST | /documents/:id/reject | documents:approve |
| POST | /documents/:id/publish | documents:publish |
| POST | /documents/:id/obsolete | documents:obsolete |
| POST | /documents/:id/cancel | documents:cancel |
| POST | /documents/:id/versions | documents:createVersion |
| GET | /documents/:id/versions | documents:read |
| POST | /documents/versions/:versionId/submit-for-review | documents:submit |
| POST | /documents/versions/:versionId/approve | documents:approve |
| POST | /documents/versions/:versionId/reject | documents:approve |
| POST | /documents/versions/:versionId/publish | documents:publish |
| POST | /documents/:id/distribute | documents:distribute |
| GET | /documents/:id/distributions | documents:read |
| POST | /documents/distributions/:distributionId/acknowledge | documents:acknowledge |

## Authorization

- Uses existing permissions from `AUTH_SPEC.md`
- `AntiIdorGuard` extended with `document` resource type
- All endpoints enforce tenant scope via `currentOrganizationId`

## Multi-tenancy

- Every repository query includes `organizationId`
- Cross-tenant access is prevented at the repository and guard levels

## Document Lifecycle

Transitions enforced in `DocumentsService`:

| Action | From | To |
|--------|------|-----|
| submit | DRAFT, REJECTED | IN_REVIEW |
| approve | PENDING_APPROVAL | APPROVED |
| reject | PENDING_APPROVAL | REJECTED |
| publish | APPROVED | CURRENT |
| obsolete | CURRENT | OBSOLETE |
| cancel | DRAFT, IN_REVIEW | CANCELLED |

Invalid transitions return `400 Bad Request`.

## Versioning

- `DocumentVersion` created with status `DRAFT`
- Versions are immutable historical records
- `currentVersionId` on `Document` tracks the active version

## Review

- `DocumentReviewer` tracks review assignments per version
- Status transitions: `PENDING` → `COMPLETED`

## Approval

- `DocumentApproval` tracks approval decisions per version
- Status transitions: `PENDING` → `APPROVED` / `REJECTED`
- Duplicate approvals are prevented by the data model

## Distribution

- `DocumentDistribution` supports user, department, and role recipients
- Status transitions: `PENDING` → `ACKNOWLEDGED`

## Acknowledgement

- `DocumentAcknowledgement` records user acknowledgements
- Duplicate acknowledgements are prevented

## File Management

- `FileAsset` is referenced via `fileAssetId` on `DocumentVersion`
- No external storage infrastructure added

## Backend

- Module: `DocumentsModule`
- Controllers: `DocumentsController`
- Services: `DocumentsService`
- Repositories: `DocumentRepository`, `DocumentVersionRepository`, `DocumentReviewerRepository`, `DocumentApprovalRepository`, `DocumentDistributionRepository`
- DTOs: `CreateDocumentDto`, `UpdateDocumentDto`, `CreateDocumentVersionDto`

## Frontend

- Page: `DocumentsPage.tsx`
- Routes: `/documents`
- Features: list, search, filter by status, create document, view detail, lifecycle actions, versions, distributions, acknowledgements

## Tests

- Backend: 111 tests pass (19 test suites)
- Frontend: 10 tests pass (5 test suites)
- Documents service tests: create, submit, get, lifecycle validation

## Build / Lint / Typecheck / Prisma

- Backend lint: PASS
- Backend typecheck: PASS
- Backend build: PASS
- Frontend lint: PASS
- Frontend typecheck: PASS
- Frontend build: PASS
- Prisma validate: PASS

## Files Changed

- `backend/src/modules/documents/` (new module)
- `backend/src/common/guards/anti-idor.guard.ts` (extended)
- `backend/src/app.module.ts` (registered DocumentsModule)
- `frontend/src/lib/auth/auth.service.ts` (added document types and API methods)
- `frontend/src/pages/DocumentsPage.tsx` (new page)
- `frontend/src/AppRoutes.tsx` (added route and navigation)

## Migrations

- None required. All models and enums already exist in `schema.prisma`.

## Breaking Changes

- None

## Known Limitations

- FileAsset upload/download is modeled as metadata association only; no binary storage implemented
- Reviewer assignment logic is simplified in the current service layer
- Optimistic locking (`If-Match`) is not yet implemented in the frontend

## Out of Scope

- Workflow Engine (deferred to future phase)
- OrganizationRequirement, Nonconformities, Risks, Training, Indicators, CAPA, Audit Management

## Workflow Engine Decision

FASE 3.3 explicitly does NOT implement a Workflow Engine. The document lifecycle uses the existing enum-based state machine in the domain/service layer. This keeps the phase independent and deliverable, while leaving the domain prepared for future generalization by a Workflow Engine.

## Final Verdict

GREEN

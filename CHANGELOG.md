# Changelog

## [1.0.0] - 2026-09-15

### Added

- Autenticación JWT con refresh token rotation y reuse detection
- MFA/TOTP con setup, challenge y disable flow
- Gestión de organizaciones multi-tenant con aislamiento
- RBAC granular (94 permisos, 4 roles)
- Anti-IDOR guard (20+ tipos de recursos)
- Gestión de departamentos con jerarquía
- Gestión de procesos con auto-código y optimistic locking
- Gestión documental con lifecycle completo (DRAFT → OBSOLETE)
- Versionado y distribución de documentos
- Acuse/acknowledgement de documentos
- Auditorías con checklists y findings
- No conformidades con root cause y CAPA
- Gestión de riesgos con evaluaciones y tratamientos
- Dashboard ejecutivo con KPIs
- Sistema de notificaciones con unread count
- File Assets con SHA-256 validación y deduplicación
- File preview (PDF, imagen, texto) y download
- CSRF protection con rotación de tokens
- Rate limiting en autenticación
- Security events logging
- Audit logs con hash SHA-256 encadenado
- Cache management con invalidación granular
- Cross-tenant isolation tests (28/28 passing)

### Security

- JWT issuer/audience validation
- HttpOnly Secure SameSite=Strict cookies in production
- Refresh token rotation on every use
- Refresh token reuse detection
- Argon2id password hashing
- MFA/TOTP authentication
- Anti-IDOR resource ownership validation
- CSRF token validation
- Rate limiting (auth: 5 attempts/60s)
- Account lockout (5 failures → 30 min)
- Helmet security headers
- CORS configuration

### Fixed

- DEF-001: Invalid UUID parameters now return 400 instead of 500
- DEF-002: Notifications unread-count endpoint returns 200 (route ordering fix)
- DEF-003: Login endpoint returns 200 OK (was 201)
- DEF-004: Removed debug console.log from Notifications module
- DEF-005: Verified Prisma configuration works correctly
- DEF-006: Fixed E2E test isolation
- DEF-007: Documented /auth/me as canonical current-user endpoint
- DEF-008: CSRF error format aligned with API standard
- DEF-009: JWT_SECRET documented for production configuration

### Testing

- Backend: 294/294 tests passing (37 suites)
- Frontend: 351/351 tests passing (8 suites)
- E2E: 15/15 tests passing (3 consecutive stable runs, 0 flaky)
- Cross-tenant isolation: 28/28 passing
- TypeScript: Clean (backend + frontend)
- Lint: Clean (backend + frontend)
- Build: Clean (backend + frontend)
- Prisma: Validate pass, Migrate up to date

---

*Changelog format based on Keep a Changelog and Semantic Versioning.*

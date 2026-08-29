# FASE C.10.6 — Audit Trail & Security Events

## Resumen
Implementación del sistema de audit trail y eventos de seguridad para la plataforma multi-tenant QMS/ISO, sin agregar features extra, modificar contratos existentes ni cambiar la arquitectura.

## Objetivos Cumplidos
- Registro inmutable de eventos de negocio y seguridad por tenant.
- Aislamiento estricto por `organizationId` (extraído exclusivamente del contexto JWT/request).
- Registro fire-and-forget con try/catch: fallas de auditoría no interrumpen operaciones.
- Política de no-logging de secretos (passwords, tokens, cookies, JWTs).
- Integración completa en servicios core: Documents, Audits, Nonconformities, Risks, Users, Organizations, FileAssets.
- Frontend: página `AuditLogsPage` con tabs, filtros y visualización segura de metadata.

## Cambios Backend

### Prisma Schema (existente, validado)
- Modelos `SecurityEvent` y `AuditLog` ya existían con índices, tenant isolation y hash chain.
- Seed ejecutado 3 veces exitosamente.

### Servicios Nuevos/Modificados
| Servicio | Cambios |
|----------|---------|
| `SecurityEventService` | Implementado con `recordEvent`, `findManyByOrganization`, `findLatestByOrganization`. |
| `AuditLogService` | Implementado con `recordEvent`, `findByCorrelationId`, `listLogs`. |
| `AuditsService` | Inyecta `AuditLogService` + `SecurityEventService`. Emite eventos para: `AUDIT_PROGRAM_CREATED`, `AUDIT_PROGRAM_UPDATED`, `AUDIT_CREATED`, `AUDIT_UPDATED`, `AUDIT_STARTED`, `AUDIT_COMPLETED`, `AUDIT_CANCELLED`, `FINDING_CREATED`, `FINDING_UPDATED`, `CHECKLIST_ITEM_UPDATED`. |
| `DocumentsService` | Inyecta servicios de auditoría. Emite eventos para ciclo de vida completo de documentos y versiones. |
| `NonconformitiesService` | Inyecta servicios de auditoría. Emite eventos para NC, root cause, corrective actions y verificaciones. |
| `RisksService` | Inyecta servicios de auditoría. Emite eventos para riesgos, assessments, controles y treatments. |
| `UsersService` | Inyecta servicios de auditoría. Emite eventos para `USER_CREATED`, `USER_UPDATED`, `USER_ACTIVATED`, `USER_DEACTIVATED`, `ROLES_ASSIGNED`. |
| `OrganizationsService` | Inyecta servicios de auditoría. Emite eventos para `ORGANIZATION_CREATED`, `ORGANIZATION_UPDATED`, `ORGANIZATION_DEACTIVATED`. |
| `FileAssetService` | Inyecta servicios de auditoría. Emite eventos para `FILE_ASSET_CREATED`, `FILE_ASSET_DELETED`. |

### Guards Modificados
| Guard | Cambios |
|-------|---------|
| `PermissionsGuard` | Registra evento `PERMISSION_DENIED` en respuestas 403. |
| `AntiIdorGuard` | Registra evento `TENANT_ACCESS_DENIED` en intentos cross-tenant. |

### Controladores Modificados
- Todos los controladores de negocio ahora extraen `organizationId` del request autenticado (nunca de query params o DTOs).
- Se añadió helper `getRequestContext(req)` para obtener `ipAddress`, `userAgent` y `correlationId`.
- Controladores actualizados: `DocumentsController`, `AuditProgramsController`, `AuditsController`, `AuditChecklistsController`, `ChecklistsController`, `AuditFindingsController`, `FindingsController`, `NonconformitiesController`, `CorrectiveActionsController`, `RisksController`, `RiskTreatmentsController`, `UsersController`, `OrganizationsController`, `FileAssetsController`.

### API Endpoints
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/audit-logs` | GET | Lista logs de auditoría con filtros y paginación. |
| `/security-events` | GET | Lista eventos de seguridad con filtros y paginación. |

## Cambios Frontend

### Página Nueva
- `src/pages/AuditLogsPage.tsx`: Página con tabs para Audit Logs y Security Events, filtros por acción/entityType/eventType/severity/actor/correlationId/fecha, paginación y detalle seguro de metadata sin exponer secretos.

### Rutas
- `/audit-logs`: Ruta protegida para acceso a auditoría.

### Cliente API
- `authApiClient.listAuditLogs()`: método para consultar audit logs.
- `authApiClient.listSecurityEvents()`: método para consultar eventos de seguridad.
- Tipos TypeScript añadidos: `AuditLog`, `AuditLogListItem`, `SecurityEvent`, `SecurityEventListItem`.

## Quality Gates

### Backend
| Gate | Resultado |
|------|-----------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS (218/218) |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx prisma migrate status` | PASS |
| Seed x3 | PASS |

### Frontend
| Gate | Resultado |
|------|-----------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS (10/10) |
| `npm run build` | PASS |

## Notas de Seguridad
- `organizationId` nunca se recibe de query params o DTOs; siempre se extrae del request autenticado.
- Metadata de audit logs sanitizada: no se loguean passwords, tokens, cookies, JWTs ni secrets.
- Eventos de auditoría se registran en bloque try/catch para no afectar operaciones de negocio.
- AntiIdorGuard y PermissionsGuard emiten eventos de seguridad automáticamente.

## Próximos Pasos (futuro, fuera de scope FASE C.10.6)
- Exportación de logs a SIEM / sistema de monitoreo externo.
- Retención y archivado de logs según política de cumplimiento.
- Alertas en tiempo real para eventos de seguridad críticos.

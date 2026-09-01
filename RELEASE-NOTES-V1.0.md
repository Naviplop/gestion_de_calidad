# RELEASE NOTES — V1.0

**Versión:** 1.0.0  
**Fecha:** 2026-09-01  
**Estado:** Release Candidate  
**Cliente:** QMS/ISO Management Platform

---

## Resumen

V1.0 entrega una plataforma empresarial de gestión de calidad ISO multi-tenant, con control de ciclo de vida documental, gestión de auditorías, no conformidades, acciones correctivas, riesgos y trazabilidad completa.

---

## Funcionalidades Incluidas

### Autenticación y Seguridad
- Login con email/password
- MFA (Multi-Factor Authentication)
- Refresh tokens HttpOnly Secure SameSite
- Access tokens en memoria (no localStorage)
- Recuperación de password
- Cambio de password
- RBAC (ADMIN, MANAGER, AUDITOR, USER)

### Gestión Documental
- CRUD de documentos
- Ciclo de vida: DRAFT → IN_REVIEW → PENDING_APPROVAL → APPROVED → PUBLISHED → OBSOLETE
- Versionado documental
- Upload de archivos (PDF, PNG, JPG, WEBP, TXT, DOCX)
- Distribución a usuarios/departamentos/roles
- Acknowledgment de distribución
- Checksum SHA-256 para integridad

### Auditorías
- Programas de auditoría
- Auditorías con checklist
- Findings (hallazgos)
- Escalamiento a NC

### No Conformidades / CAPA
- Registro de NC
- Análisis de causa raíz
- Acciones correctivas (CAPA)
- Verificación de efectividad
- Cierre de NC

### Riesgos
- Registro de riesgos
- Assessment (probabilidad, impacto, score)
- Controles preventivos/detectivos
- Tratamientos (MITIGATE, TRANSFER, ACCEPT, AVOID)

### Trazabilidad
- Audit Logs con hash chain
- Security Events
- Correlación de eventos

### Administración
- Gestión de usuarios
- Roles y permisos
- Configuración de organización
- Security Settings

---

## Seguridad

- Guards globales: AuthGuard, TenantContextGuard, PermissionsGuard, AntiIdorGuard
- CSRF protection
- Rate limiting en auth y file upload
- Input validation estricta (whitelist, forbidNonWhitelisted)
- Tenant isolation estricto
- IDOR protection
- Sanitización de secrets en logs
- JWT algorithm HS256 explícito
- Soft delete de archivos

---

## Mejoras

- Lifecycle enforcement backend-side (sin bypass por DTO)
- Prisma enums aplicados (AuditStatus, NonconformityStatus, CorrectiveActionStatus, RiskStatus)
- N+1 queries resueltos en distributeDocument y closeNonconformity
- Índices de base de datos optimizados
- UUIDs criptográficamente seguros (crypto.randomUUID)
- File upload limitado a 20MB con FileInterceptor
- Validación estricta de DTOs

---

## Limitaciones Conocidas

### Aceptadas para V1.0

| Limitación | Impacto | Plan futuro |
| ---------- | ------- | ----------- |
| npm audit backend: 7 high, 15 moderate | Bajo | Upgrade a NestJS v12 en post-V1.0 |
| npm audit frontend: 1 critical, 1 high | Bajo | Upgrade a Vite 8 en post-V1.0 |
| S3 adapter no implementado | Bajo | Arquitectura soporta S3; implementación en V2 |
| Dead code menor (3 archivos sin uso) | Muy bajo | Limpieza en post-V1.0 |
| API_SPEC.md requiere auditoría continua | Bajo | Proceso de documentación continua |

### No incluidas en V1.0

- S3 storage (solo local)
- Analytics avanzados
- Billing/SaaS multi-tenant comercial
- API pública / webhooks
- Notificaciones email in-app
- Reporting avanzado (PDF/Excel)
- Multi-idioma
- Mobile app

---

## Requisitos

### Mínimos
- Node.js 20.x LTS
- PostgreSQL 14.x
- npm 9.x

### Recomendados
- Docker 24.x
- Nginx 1.24+
- Redis (para sesiones en producción)

---

## Compatibilidad

- Navegadores: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Resolución mínima: 1280x720
- JavaScript habilitado

---

## Soporte

Para reportar issues o solicitar soporte, contactar al equipo técnico.

---

## Próximos Pasos (Roadmap Post-V1.0)

1. S3 storage adapter
2. Upgrade de dependencias mayores
3. Limpieza de dead code
4. API pública / webhooks
5. Analytics y reporting avanzado
6. Multi-idioma
7. Mobile responsive mejorado
8. Billing / SaaS commercial

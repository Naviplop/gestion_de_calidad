# POST-RELEASE ROADMAP — V1.1 / V2.0

## Contexto

V1.0 ha sido entregada y aceptada por el cliente. Este documento define la evolución futura del sistema fuera del alcance de la entrega inicial.

**No se modifica código durante la planificación.**

---

## V1.1 — Stabilization & Technical Debt (Post-Release Inmediato)

Objetivo: cerrar deuda técnica aceptada sin introducir breaking changes.

| Item | Prioridad | Estimación | Estado |
| ---- | --------- | ---------- | ------ |
| Limpiar dead code (3 archivos sin uso) | BAJA | 1 día | Pendiente |
| Documentar API_SPEC.md | BAJA | 2 días | Pendiente |
| Revisar npm audit non-breaking | MEDIA | 1 día | Pendiente |

Criterio de salida V1.1:
- 0 dead code en src/
- API_SPEC.md auditada
- npm audit sin incremento de vulnerabilidades

---

## V2.0 — Features & Architecture Evolution

Objetivo: evolucionar la plataforma para escalar comercialmente.

### Storage
- Implementar S3 adapter
- Mantener abstraction sobre StorageProvider
- Migración transparente desde local storage

### API
- API pública para integraciones
- Webhooks para eventos de negocio
- Versionado de API (/api/v2)

### Notificaciones
- Email notifications
- In-app notifications
- Preferencias de usuario

### Reporting
- Export PDF/Excel
- Dashboards avanzados
- Scheduled reports

### Multi-idioma
- i18n frontend
- Traducciones backend
- Detección de locale

### Mobile
- Responsive mejorado
- PWA capabilities
- Offline mode (si aplica)

### Billing / SaaS
- Plans y límites por tenant
- Usage tracking
- Invoicing (si aplica)

### Seguridad
- SAML/SSO enterprise
- Audit log retention policies
- Advanced threat detection

---

## Decisiones Pendientes

| Decisión | Opciones | Recomendación |
| -------- | -------- | ------------- |
| S3 provider | AWS / Azure / GCP / MinIO | Evaluar con cliente |
| Webhooks | Push / Pull | Push con retry |
| Email provider | SMTP / SendGrid / SES | Evaluar con cliente |
| Mobile | Native / PWA | PWA primero |
| SSO | SAML / OAuth2 / OIDC | OIDC si cliente usa Azure/Google |

---

## Criterios de Transición

Para pasar de V1.0 a V1.1 o V2.0 se requiere:

1. V1.0 aceptada y firmada
2. Deuda V1.1 priorizada por cliente
3. Presupuesto y timeline definidos
4. Equipo asignado

---

## Fuera de Scope (mantener en V1.0)

- S3 storage (solo local)
- Analytics avanzados
- Billing/SaaS comercial
- API pública / webhooks
- Notificaciones email
- Reporting PDF/Excel
- Multi-idioma
- Mobile app
- SAML/SSO enterprise
- Breaking changes en API

---

**Documento generado:** 2026-09-01  
**Estado:** Borrador — Pendiente aprobación del cliente para iniciar

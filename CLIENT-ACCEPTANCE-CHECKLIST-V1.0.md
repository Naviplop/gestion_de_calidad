# CLIENT ACCEPTANCE CHECKLIST — V1.0

## Instrucciones

Marcar cada item como:
- [x] PASS
- [ ] FAIL
- [ ] N/A

Registrar observaciones en la columna correspondiente.

---

## Funcionalidad

| Item | Estado | Observaciones |
| ---- | ------ | -------------- |
| Login con email/password | [ ] | |
| MFA (Multi-Factor Authentication) | [ ] | |
| Dashboard con KPIs | [ ] | |
| Crear documento | [ ] | |
| Subir archivo adjunto | [ ] | |
| Editar documento | [ ] | |
| Lifecycle: DRAFT → IN_REVIEW | [ ] | |
| Lifecycle: IN_REVIEW → PENDING_APPROVAL | [ ] | |
| Lifecycle: PENDING_APPROVAL → APPROVED | [ ] | |
| Lifecycle: APPROVED → PUBLISHED | [ ] | |
| Lifecycle: PUBLISHED → OBSOLETE | [ ] | |
| Cancelar documento | [ ] | |
| Distribuir documento | [ ] | |
| Crear programa de auditoría | [ ] | |
| Crear auditoría | [ ] | |
| Checklist de auditoría | [ ] | |
| Registrar finding | [ ] | |
| Generar NC desde finding | [ ] | |
| Análisis de causa raíz | [ ] | |
| Crear acción correctiva (CAPA) | [ ] | |
| Verificar acción correctiva | [ ] | |
| Cerrar no conformidad | [ ] | |
| Crear riesgo | [ ] | |
| Evaluar riesgo (assessment) | [ ] | |
| Registrar control | [ ] | |
| Definir tratamiento | [ ] | |
| Cerrar riesgo | [ ] | |
| Descargar archivo | [ ] | |
| Verificar integridad de archivo | [ ] | |
| Audit Logs | [ ] | |
| Security Events | [ ] | |
| Gestión de usuarios | [ ] | |
| Configuración de organización | [ ] | |
| Security Settings (MFA/password/recovery) | [ ] | |
| Logout | [ ] | |

---

## Seguridad

| Item | Estado | Observaciones |
| ---- | ------ | -------------- |
| Access token NO en localStorage | [ ] | |
| Refresh token HttpOnly | [ ] | |
| MFA funcional | [ ] | |
| Permisos por rol | [ ] | |
| Aislamiento entre tenants | [ ] | |
| No acceso a datos de otro tenant | [ ] | |
| CSRF protection | [ ] | |
| Rate limiting en login | [ ] | |
| Rate limiting en file upload | [ ] | |
| Validación de DTOs (whitelist + forbidNonWhitelisted) | [ ] | |
| Passwords hasheados (no明文) | [ ] | |
| Secrets no en logs | [ ] | |
| Stack traces no expuestos | [ ] | |
| File size limit (20MB) | [ ] | |
| MIME allowlist | [ ] | |
| Soft delete de archivos | [ ] | |

---

## Calidad

| Item | Estado | Observaciones |
| ---- | ------ | -------------- |
| Backend lint PASS | [ ] | |
| Backend typecheck PASS | [ ] | |
| Backend tests PASS (256/256) | [ ] | |
| Backend build PASS | [ ] | |
| Frontend lint PASS | [ ] | |
| Frontend typecheck PASS | [ ] | |
| Frontend tests PASS (10/10) | [ ] | |
| Frontend build PASS | [ ] | |
| Prisma validate PASS | [ ] | |
| Prisma generate PASS | [ ] | |
| Prisma migrate status UP TO DATE | [ ] | |
| Seed idempotente (3 ejecuciones) | [ ] | |

---

## UX / Browser

| Item | Estado | Observaciones |
| ---- | ------ | -------------- |
| Sin pantallas blancas | [ ] | |
| Sin loading infinito | [ ] | |
| Sin botones muertos | [ ] | |
| Sin alert/prompt nativos | [ ] | |
| Sin datos mock presentados como reales | [ ] | |
| Sin errores 500 inesperados | [ ] | |
| Console sin errores críticos | [ ] | |
| Responsive básico | [ ] | |
| Navegación funcional | [ ] | |
| Logout funcional | [ ] | |

---

## Cliente

| Item | Estado | Observaciones |
| ---- | ------ | -------------- |
| Demo realizada | [ ] | |
| Usuarios capacitados | [ ] | |
| Manual de usuario entregado | [ ] | |
| Manual de administrador entregado | [ ] | |
| Observaciones registradas | [ ] | |
| Aceptación formal firmada | [ ] | |

---

## Firma de Aceptación

**Cliente:**

Nombre: ___________________________

Cargo: ___________________________

Fecha: ___________________________

Firma: ___________________________

**Proveedor:**

Nombre: ___________________________

Cargo: ___________________________

Fecha: ___________________________

Firma: ___________________________

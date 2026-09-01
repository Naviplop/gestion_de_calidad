# UAT TEST PLAN — V1.0

## Objetivo
Proporcionar escenarios de prueba que el cliente pueda ejecutar para validar el sistema antes de la aceptación formal.

## Instrucciones para el cliente
1. Seguir cada escenario paso a paso
2. Registrar resultado: PASS / FAIL / N/A
3. Anotar observaciones en la columna correspondiente
4. Reportar cualquier anomalía al equipo técnico

---

## Escenario 1 — Login y Seguridad

| ID | UAT-001 |
| --- | ------- |
| Objetivo | Verificar acceso seguro al sistema |
| Precondiciones | Usuario demo creado, MFA configurado |
| Pasos | 1. Abrir URL staging<br>2. Ingresar email/password<br>3. Ingresar código MFA<br>4. Navegar por dashboard |
| Resultado esperado | Login exitoso, acceso a dashboard, MFA validado |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 2 — Cambio de Password

| ID | UAT-002 |
| --- | ------- |
| Objetivo | Verificar cambio de contraseña |
| Precondiciones | Usuario logueado |
| Pasos | 1. Ir a `/security`<br>2. Pestaña "Password"<br>3. Ingresar password actual y nuevo<br>4. Guardar<br>5. Cerrar sesión<br>6. Login con nuevo password |
| Resultado esperado | Password cambiado, login con nuevo password funciona |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 3 — Documento Completo

| ID | UAT-003 |
| --- | ------- |
| Objetivo | Verificar flujo documental completo |
| Precondiciones | Usuario con permisos de edición |
| Pasos | 1. Crear documento DRAFT<br>2. Subir archivo PDF<br>3. Submit (DRAFT → IN_REVIEW)<br>4. Submit for Approval (IN_REVIEW → PENDING_APPROVAL)<br>5. Approve (PENDING_APPROVAL → APPROVED)<br>6. Publish (APPROVED → PUBLISHED)<br>7. Distribuir a usuario<br>8. Ver distribución |
| Resultado esperado | Transiciones válidas, archivo disponible, distribución registrada |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 4 — Auditoría y Finding

| ID | UAT-004 |
| --- | ------- |
| Objetivo | Verificar flujo de auditoría |
| Precondiciones | Programa de auditoría creado |
| Pasos | 1. Crear auditoría en programa<br>2. Completar checklist<br>3. Registrar finding MAJOR<br>4. Verificar que se genera NC |
| Resultado esperado | Auditoría registrada, finding vinculado, NC generada |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 5 — No Conformidad y CAPA

| ID | UAT-005 |
| --- | ------- |
| Objetivo | Verificar flujo NC → CAPA → Close |
| Precondiciones | NC abierta |
| Pasos | 1. Abrir NC<br>2. Completar root cause<br>3. Crear CAPA<br>4. Completar CAPA<br>5. Verificar CAPA<br>6. Cerrar NC |
| Resultado esperado | NC cerrada solo con root cause y CAPA verificada |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 6 — Riesgo

| ID | UAT-006 |
| --- | ------- |
| Objetivo | Verificar gestión de riesgos |
| Precondiciones | Usuario con permisos |
| Pasos | 1. Crear riesgo<br>2. Crear assessment<br>3. Registrar control<br>4. Crear treatment<br>5. Cerrar riesgo |
| Resultado esperado | Risk → Assessment → Control → Treatment → Close |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 7 — Archivos

| ID | UAT-007 |
| --- | ------- |
| Objetivo | Verificar upload/download/integrity |
| Precondiciones | Documento creado |
| Pasos | 1. Subir archivo PDF < 20MB<br>2. Descargar archivo<br>3. Verificar checksum SHA-256<br>4. Intentar subir archivo > 20MB → rechazo<br>5. Intentar subir .exe → rechazo |
| Resultado esperado | Upload/download funcionan, validaciones bloquean archivos inválidos |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 8 — Aislamiento entre Tenants

| ID | UAT-008 |
| --- | ------- |
| Objetivo | Verificar que un tenant no accede a datos de otro |
| Precondiciones | Dos organizaciones demo |
| Pasos | 1. Login como usuario Tenant A<br>2. Intentar acceder a recurso de Tenant B por ID<br>3. Verificar rechazo 403/404 |
| Resultado esperado | Acceso denegado, sin leak de datos |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 9 — Permisos

| ID | UAT-009 |
| --- | ------- |
| Objetivo | Verificar RBAC |
| Precondiciones | Usuarios con roles ADMIN, MANAGER, AUDITOR, USER |
| Pasos | 1. Login como USER → verificar acceso limitado<br>2. Login como AUDITOR → verificar acceso a auditorías<br>3. Login como MANAGER → verificar acceso operativo<br>4. Login como ADMIN → verificar acceso total |
| Resultado esperado | Cada rol ve solo lo permitido |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Escenario 10 — Logout

| ID | UAT-010 |
| --- | ------- |
| Objetivo | Verificar cierre de sesión seguro |
| Precondiciones | Usuario logueado |
| Pasos | 1. Click en Logout<br>2. Intentar usar refresh token viejo<br>3. Verificar rechazo |
| Resultado esperado | Sesión cerrada, refresh token revocado |
| Resultado real | |
| Estado | PASS / FAIL / N/A |
| Observaciones | |

---

## Resumen

| Escenario | Estado |
| --------- | ------ |
| UAT-001 | PASS / FAIL / N/A |
| UAT-002 | PASS / FAIL / N/A |
| UAT-003 | PASS / FAIL / N/A |
| UAT-004 | PASS / FAIL / N/A |
| UAT-005 | PASS / FAIL / N/A |
| UAT-006 | PASS / FAIL / N/A |
| UAT-007 | PASS / FAIL / N/A |
| UAT-008 | PASS / FAIL / N/A |
| UAT-009 | PASS / FAIL / N/A |
| UAT-010 | PASS / FAIL / N/A |

### Aprobación

**Cliente:**

Nombre: ___________________________

Fecha: ___________________________

Firma: ___________________________

**Equipo Técnico:**

Nombre: ___________________________

Fecha: ___________________________

Firma: ___________________________

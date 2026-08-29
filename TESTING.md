# TESTING.md — Estrategia y Arquitectura de Pruebas del QMS

## 1. Testing Conflicts

### CONFLICT-001: Cobertura de Testing Frontend

| Campo | Valor |
|---|---|
| **Fuente 1** | `ARCHITECTURE.md` §12.2 — define Vitest + Testing Library para unit/component tests y Playwright para E2E |
| **Fuente 2** | `FRONTEND.md` §77 — lista también Vitest, Testing Library y Playwright con roles diferenciados |
| **Conflicto** | Ambas fuentes coinciden en herramientas. No existe contradicción. |
| **Impacto** | N/A. |

No se detectaron otros conflictos entre `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API_SPEC.md`, `DOMAIN.md`, `AUTH_SPEC.md`, `WORKFLOW_SPEC.md`, `DOCUMENT_MANAGEMENT.md`, `AUDIT_SYSTEM.md`, `FRONTEND.md` y `prisma/schema.prisma` que impidan definir la estrategia de testing en esta fase.

---

## 2. Quality Principles

### 2.1 Principios de Calidad

El sistema debe validarse contra:

- **Correctness**: el comportamiento coincide con las reglas de dominio y workflows.
- **Security**: autenticación, autorización, aislamiento multi-tenant y protección de datos.
- **Maintainability**: tests reproducibles, aislados y mantenibles.
- **Reliability**: el sistema se comporta de forma predecible bajo condiciones normales y adversas.
- **Traceability**: cada requisito y regla de negocio tiene tests demostrables.
- **Reproducibility**: cualquier test puede ejecutarse en cualquier ambiente con el mismo resultado.
- **Isolation**: los tests no dependen del orden ni comparten estado mutable.
- **Performance**: el sistema cumple objetivos de latencia y throughput definidos.

### 2.2 Alcance

Testing no se limita a comprobar que una función devuelve un valor. Debe validar:

- Reglas de dominio.
- Transiciones de workflow.
- Contratos de API.
- Aislamiento entre tenants.
- Integridad de datos.
- Seguridad.
- Accesibilidad.
- Performance.

---

## 3. Testing Pyramid

### 3.1 Estructura

```
        E2E
       /    \
   Contract  |
   /        \
Integration  |
/            \
Unit          |
```

### 3.2 Niveles

| Nivel | Objetivo | Cuándo Usar |
|---|---|---|
| **Unit** | Validar lógica pura: domain rules, value objects, validators, calculos. | Reglas de negocio, invariantes, transiciones. |
| **Integration** | Validar interacción entre componentes internos: repository + domain, service + database, API + service. | Lógica que requiere infraestructura pero no E2E. |
| **Contract** | Validar que endpoints respetan `API_SPEC.md`. | Cambios en API, versionado, integraciones. |
| **E2E** | Validar flujos completos desde UI o API hasta persistencia. | Flujos críticos, onboarding, compliance. |

### 3.3 Trade-offs

- Evitar demasiados E2E cuando un test de menor nivel puede demostrar la misma regla.
- Los E2E son costosos y lentos; usarlos para flujos críticos, no para casos borde repetitivos.
- Los unit tests son rápidos y baratos; maximizar cobertura en lógica de dominio.

---

## 4. Test Categories

### 4.1 Categorías

| Categoría | Alcance |
|---|---|
| **Unit** | Lógica aislada sin infraestructura. |
| **Integration** | Componentes internos juntos: repository, service, database. |
| **API** | Endpoints HTTP: request, response, status codes, autenticación, autorización. |
| **Contract** | Cumplimiento estricto de `API_SPEC.md`. |
| **E2E** | Flujos completos del sistema. |
| **Security** | Autenticación, autorización, IDOR, inyección, XSS, CSRF, rate limiting. |
| **Performance** | Latencia, throughput, tiempos de respuesta. |
| **Load** | Comportamiento bajo carga esperada. |
| **Stress** | Punto de quiebre del sistema. |
| **Accessibility** | Cumplimiento WCAG 2.2 AA. |
| **Regression** | Validación de funcionalidad existente tras cambios. |
| **Migration** | Migraciones de base de datos. |
| **Recovery** | Recuperación ante fallos: backup, restore, disaster recovery. |

---

## 5. Unit Tests

### 5.1 Alcance

Deben cubrir:

- **Domain rules**: invariantes de aggregates.
- **Value objects**: validaciones, comparaciones, serialización.
- **Validators**: reglas de formato y negocio.
- **State transitions**: máquinas de estado.
- **Permission policies**: lógica de permisos sin HTTP.
- **Calculaciones**: scores de riesgo, porcentajes, métricas.
- **Risk scoring**: cálculo de probability, impact, risk level.
- **Versioning**: lógica de generación de versiones.
- **Business rules**: reglas enumeradas en documentos de dominio.

### 5.2 Regla

No depender de infraestructura cuando no sea necesario. Los unit tests deben ejecutarse sin base de datos, red ni archivos.

---

## 6. Domain Testing

### 6.1 Alcance por Aggregate

Cada aggregate importante debe tener tests para:

| Caso | Descripción |
|---|---|
| **Creation** | Creación válida e inválida. |
| **Valid mutation** | Mutaciones permitidas por el dominio. |
| **Invalid mutation** | Mutaciones rechazadas por invariantes. |
| **Transitions** | Cambios de estado permitidos y prohibidos. |
| **Invariants** | Condiciones que nunca deben violarse. |
| **Authorization** | Quién puede ejecutar cada operación. |
| **Edge cases** | Valores límite, nulls, vacíos. |

### 6.2 Ejemplo Conceptual

```
Document
  - canBeCreatedBy(owner)
  - cannotTransitionFrom(DRAFT) to PUBLISHED
  - mustHaveOwner()
  - version increments correctly
```

---

## 7. Workflow Testing

### 7.1 Estructura

Para cada workflow:

```
Estado Actual
→ Acción
→ Estado Siguiente
```

### 7.2 Casos por Probar

| Caso | Descripción |
|---|---|
| **Transición válida** | Acción permitida desde el estado actual. |
| **Transición inválida** | Acción prohibida desde el estado actual. |
| **Actor autorizado** | Usuario con permiso puede ejecutar. |
| **Actor no autorizado** | Usuario sin permiso es rechazado. |
| **Precondiciones** | Faltan datos requeridos. |
| **Side effects** | Eventos, audit logs, notificaciones. |
| **Audit event** | Se registra en audit trail. |
| **Domain event** | Se emite evento de dominio. |

---

## 8. State Machine Testing

### 8.1 Matriz

| Aggregate | Current State | Action | Expected State | Allowed Roles | Forbidden Roles | Side Effects | Audit Event |
|---|---|---|---|---|---|---|---|
| Document | DRAFT | submit | IN_REVIEW | Document Owner, Editor | Auditor | Notify reviewers | DOCUMENT_SUBMITTED |
| Document | IN_REVIEW | approve | PENDING_APPROVAL | Reviewer | Document Owner | Notify approvers | DOCUMENT_REVIEWED |
| Document | PENDING_APPROVAL | approve | APPROVED | Approver | Reviewer | Notify publisher | DOCUMENT_APPROVED |
| Document | APPROVED | publish | PUBLISHED | Publisher | Document Owner | Distribute, audit log | DOCUMENT_PUBLISHED |
| Document | PUBLISHED | obsolete | OBSOLETE | Quality Manager | Document Owner | Archive versions | DOCUMENT_OBSOLETED |
| Audit | PLANNED | start | IN_PROGRESS | Lead Auditor | Process Owner | Notify team | AUDIT_STARTED |
| Audit | IN_PROGRESS | complete | COMPLETED | Lead Auditor | Auditor sin asignación | Generate report | AUDIT_COMPLETED |
| Audit | COMPLETED | close | CLOSED | Quality Manager | Auditor | Finalize | AUDIT_CLOSED |
| Nonconformity | OPEN | rootCause | ROOT_CAUSE | Quality Owner | Auditor | Notify | NONCONFORMITY_ROOT_CAUSE |
| Nonconformity | ROOT_CAUSE | createAction | ACTION | Quality Owner | Auditor | Assign action | NONCONFORMITY_ACTION_CREATED |
| Nonconformity | ACTION | verify | VERIFIED | Quality Manager | Quality Owner | Notify | NONCONFORMITY_VERIFIED |
| Nonconformity | VERIFIED | close | CLOSED | Quality Manager | Auditor | Archive | NONCONFORMITY_CLOSED |
| Risk | IDENTIFIED | assess | ASSESSED | Risk Owner | Auditor | Notify | RISK_ASSESSED |
| Risk | ASSESSED | treat | TREATMENT | Risk Owner | Auditor | Notify | RISK_TREATMENT_CREATED |
| Risk | TREATMENT | reassess | REASSESSED | Risk Owner | Auditor | Update score | RISK_REASSESSED |

### 8.2 Regla

Debe cubrir todas las transiciones posibles. No dejar transiciones sin probar.

---

## 9. API Testing

### 9.1 Aspectos a Probar

| Aspecto | Descripción |
|---|---|
| **Request validation** | Campos requeridos, formatos, límites. |
| **Response schema** | Estructura, tipos, campos requeridos. |
| **Status codes** | 2xx, 4xx, 5xx correctos. |
| **Authentication** | Token válido, inválido, ausente. |
| **Authorization** | Permisos por endpoint. |
| **Tenant isolation** | No filtrar datos de otros tenants. |
| **Error contract** | Formato de error normalizado. |
| **Pagination** | Límites, offsets, cursores, metadatos. |
| **Filtering** | Filtros válidos e inválidos. |
| **Sorting** | Ordenamientos permitidos. |
| **Idempotency** | Requests repetidas no generan duplicados. |

### 9.2 Regla

Todo endpoint público o autenticado debe tener tests de contrato y comportamiento.

---

## 10. API Contract Testing

### 10.1 Base

Los endpoints deben respetar `API_SPEC.md`.

### 10.2 Validación

| Elemento | Descripción |
|---|---|
| **Request** | Método, path, headers, body. |
| **Response** | Status code, headers, body. |
| **Fields** | Nombres, tipos, requeridos. |
| **Error codes** | Códigos documentados en `API_SPEC.md`. |
| **Breaking changes** | Cambios incompatibles detectados por tests. |

### 10.3 Regla

Si el API cambia, los tests deben detectar breaking changes antes de merge.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Autenticación, Seguridad, Pruebas Multi-Tenant e IDOR]

---

## 11. Authentication Testing

### 11.1 Casos

| Caso | Descripción |
|---|---|
| **Valid login** | Credenciales correctas retornan token. |
| **Invalid credentials** | Email/password incorrectos retornan 401. |
| **Expired session** | Token expirado redirige a login o intenta refresh. |
| **Revoked session** | Sesión revocada retorna 401. |
| **MFA valid** | Código TOTP válido completa autenticación. |
| **MFA invalid** | Código incorrecto retorna 401. |
| **Disabled account** | Cuenta deshabilitada retorna 403. |
| **Password recovery** | Flujo de reset funciona y expira correctamente. |
| **Session renewal** | Refresh token renueva access token. |
| **Logout** | Invalida refresh token. |

### 11.2 Regla

Respetar `AUTH_SPEC.md` como contrato de comportamiento.

---

## 12. Authorization Testing

### 12.1 Casos

| Caso | Descripción |
|---|---|
| **Permission granted** | Usuario con permiso accede al recurso. |
| **Permission denied** | Usuario sin permiso recibe 403. |
| **Role mismatch** | Rol no autorizado no puede ejecutar operación. |
| **Resource authorization** | `documents:approve` no permite aprobar cualquier documento. |
| **Organization mismatch** | Usuario no puede acceder a datos de otra organización. |

### 12.2 Regla

Nunca asumir que `authenticated = authorized`. Cada endpoint valida permiso y pertenencia.

---

## 13. Multi-Tenant Isolation Testing

### 13.1 Suite: `CrossTenantAccessTests`

Debe existir una suite dedicada.

### 13.2 Datos de Prueba

Crear al menos:

| Entidad | Tenant A | Tenant B |
|---|---|---|
| **Organización** | OrgA | OrgB |
| **Usuario** | UserA | UserB |
| **Documento** | DocA | DocB |
| **Auditoría** | AuditA | AuditB |
| **No Conformidad** | NcA | NcB |

### 13.3 Casos

| Caso | Descripción |
|---|---|
| **UserA → accede a DocA** | Permitido. |
| **UserA → NO accede a DocB** | 403 o 404 según política. |
| **UserA → lista documentos** | Solo documentos de OrgA. |
| **UserA → search** | No retorna resultados de OrgB. |
| **UserA → export** | Exporta solo datos de OrgA. |
| **UserA → download** | No puede descargar archivo de OrgB. |
| **Relaciones anidadas** | No exponer recursos relacionados de otro tenant. |
| **Bulk operations** | Operaciones masivas respetan tenant. |

### 13.4 Regla

Todo módulo multi-tenant debe tener pruebas explícitas de aislamiento.

---

## 14. IDOR Testing

### 14.1 Objetivo

Probar que cambiar un identificador por un recurso de otro tenant no expone datos.

### 14.2 Casos

| Request | Manipulación | Esperado |
|---|---|---|
| `GET /documents/{id}` | `id` de otro tenant | 403 o 404 |
| `GET /audits/{id}` | `id` de otro tenant | 403 o 404 |
| `GET /nonconformities/{id}` | `id` de otro tenant | 403 o 404 |
| `PATCH /documents/{id}` | `id` de otro tenant | 403 o 404 |
| `DELETE /documents/{id}` | `id` de otro tenant | 403 o 404 |

### 14.3 Regla

Aplicar a todos los recursos sensibles. Nunca confiar en que el cliente no manipula IDs.

---

## 15. Privilege Escalation Testing

### 15.1 Casos

| Escenario | Descripción |
|---|---|
| **User → Admin** | Usuario normal no puede elevar privilegios modificando requests. |
| **Auditor → Administrator** | Auditor no puede acceder a rutas de admin. |
| **Reviewer → Publisher** | Revisor no puede publicar sin permiso. |
| **Process Owner → Quality Manager** | No puede ejecutar operaciones de calidad. |
| **Token manipulation** | Modificar claims de JWT no otorga acceso. |

### 15.2 Regla

No debe ser posible elevar privilegios modificando requests, headers o tokens.

---

## 16. Database Testing

### 16.1 Casos

| Caso | Descripción |
|---|---|
| **Migrations** | Aplican correctamente y dejan schema válido. |
| **Unique constraints** | Duplicados son rechazados. |
| **Foreign keys** | Referencias inválidas son rechazadas. |
| **Indexes** | Consultas usan índices esperados. |
| **Transactions** | Rollback completo ante fallo. |
| **Cascading rules** | Borrados en cascada funcionan correctamente. |
| **Nullability** | Campos requeridos no aceptan null. |

---

## 17. Migration Testing

### 17.1 Casos

| Caso | Descripción |
|---|---|
| **Clean → migration → valid** | Base limpia migra correctamente. |
| **Previous version → migration → new version** | Migración desde versión anterior funciona. |
| **Rollback** | Si aplica, rollback a versión anterior funciona. |

### 17.2 Regla

Toda migration debe probarse en ambos sentidos cuando sea posible.

---

## 18. Seed Testing

### 18.1 Casos

| Caso | Descripción |
|---|---|
| **Reproducible** | Ejecutar seed varias veces produce mismo resultado. |
| **Determinista** | No depende de hora actual o datos aleatorios sin seed. |
| **Segura** | No incluye secretos reales. |
| **Separada de producción** | No se ejecuta contra prod inadvertidamente. |

---

## 19. Transaction Testing

### 19.1 Casos

| Caso | Descripción |
|---|---|
| **Success** | Todas las operaciones se persisten. |
| **Failure mid-transaction** | Rollback completo, no queda estado parcial. |
| **Partial failure** | Ningún side effect queda sin operación principal. |

### 19.2 Ejemplo

```
PublishDocument
  → create audit event
    → distribute document
      → FAIL
        → ROLLBACK completo
```

### 19.3 Regla

Si falla una operación intermedia, no debe quedar documento publicado sin audit event.

---

## 20. Concurrency Testing

### 20.1 Casos

| Caso | Descripción |
|---|---|
| **Aprobar documento simultáneamente** | Solo una aprobación es válida. |
| **Publicar documento simultáneamente** | Conflicto detectado. |
| **Editar documento simultáneamente** | Optimistic locking detecta conflicto. |
| **Cerrar auditoría simultáneamente** | Solo un cierre es válido. |
| **Actualizar checklist simultáneamente** | Conflicto detectado. |

### 20.2 Regla

Definir expected behavior para cada caso de concurrencia.

---

## 21. Optimistic Concurrency

### 21.1 Caso

```
Version 10
  → User A lee
    → User B modifica
      → User A modifica versión antigua
        → CONFLICT
```

### 21.2 Regla

Debe detectarse conflicto y retornar error de versión.

---

## 22. Idempotency Testing

### 22.1 Casos

| Operación | Repeticiones | Esperado |
|---|---|---|
| **Approve** | 2, 3, 10 veces | Una sola aprobación. |
| **Publish** | 2, 3, 10 veces | Una sola publicación. |
| **Distribute** | 2, 3, 10 veces | Una sola distribución. |
| **Acknowledge** | 2, 3, 10 veces | Un solo acuse. |
| **Close** | 2, 3, 10 veces | Un solo cierre. |

### 22.2 Mecanismo

Usar `Idempotency-Key` header cuando corresponda.

---

## 23. Audit Trail Testing

### 23.1 Casos

| Operación | Audit Event Esperado |
|---|---|
| **Create** | `{resource}_CREATED` |
| **Update** | `{resource}_UPDATED` |
| **Approve** | `{resource}_APPROVED` |
| **Publish** | `{resource}_PUBLISHED` |
| **Reject** | `{resource}_REJECTED` |
| **Archive** | `{resource}_ARCHIVED` |
| **Restore** | `{resource}_RESTORED` |
| **Delete** | `{resource}_DELETED` |

### 23.2 Validar

| Campo | Descripción |
|---|---|
| **Actor** | Usuario que ejecutó la operación. |
| **Timestamp** | Momento exacto. |
| **Resource** | Tipo y ID del recurso. |
| **Action** | Acción ejecutada. |
| **Correlation** | Correlation ID propagado. |
| **Tenant** | Organización a la que pertenece. |

### 23.3 Regla

Toda operación crítica debe generar el evento esperado sin excepción.

---

## 24. Audit Log Immutability

### 24.1 Casos

| Caso | Descripción |
|---|---|
| **User normal → modificar log** | Rechazado. |
| **User normal → eliminar log** | Rechazado. |
| **User normal → falsificar log** | Rechazado. |
| **Admin → modificar log** | Rechazado (logs son inmutables para todos). |

### 24.2 Regla

Ningún usuario puede modificar, eliminar o falsificar audit logs. Solo lectura.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Subsistemas de Dominio, Frontend y Pruebas E2E]

---

## 25. Document Testing

### 25.1 Ciclo de Vida

| Caso | Descripción |
|---|---|
| **Create** | Creación de borrador con metadata válida. |
| **Upload** | Carga de archivo, validación de tipo y tamaño. |
| **Validation** | Validación de contenido y malware scan. |
| **Version** | Generación correcta de versiones. |
| **Review** | Ejecución de revisión con aprobación/rechazo. |
| **Approval** | Aprobación por rol autorizado. |
| **Publication** | Publicación con distribución. |
| **Distribution** | Envío a destinatarios, acuses. |
| **Acknowledgement** | Registro de acuse de recibo. |
| **Obsolete** | Marcado como obsoleto. |
| **Archive** | Archivado con preservación de historial. |
| **Restore** | Restauración desde archivo. |

---

## 26. Document Version Testing

### 26.1 Casos

| Caso | Descripción |
|---|---|
| **Publish V1 → update V1** | Debe fallar. Versión publicada es inmutable. |
| **Publish V1 → create V2** | Nueva versión se crea correctamente. |
| **V1 signature ≠ V2 signature** | La firma de V1 no se aplica a V2. |
| **Version label** | Secuencia correcta: 1.0 → 1.1 → 2.0. |

---

## 27. Document Signature Testing

### 27.1 Caso

```
Version 1 → Signed
Version 2 → Created
```

La firma de Version 1 **NO** debe considerarse firma de Version 2.

### 27.2 Regla

Cada versión mantiene su propia integridad y firmas independientes.

---

## 28. File Integrity Testing

### 28.1 Casos

| Caso | Descripción |
|---|---|
| **Upload → hash** | Se calcula y almacena hash SHA-256. |
| **Modify file → verify** | Detecta `FILE_INTEGRITY_ERROR`. |
| **Corrupted upload** | Rechazado o marcado como inválido. |

---

## 29. File Security Testing

### 29.1 Casos

| Caso | Descripción |
|---|---|
| **Invalid extension** | Rechazado. |
| **MIME spoofing** | Detectado por magic bytes. |
| **Oversized file** | Rechazado. |
| **Malformed file** | Rechazado. |
| **Malicious file** | Detectado por malware scanner. |
| **Duplicate filename** | Manejado sin sobrescritura. |
| **Path traversal** | Bloqueado. |
| **Dangerous filename** | Sanitizado. |

---

## 30. Audit System Testing

### 30.1 Ciclo Completo

| Caso | Descripción |
|---|---|
| **Create Program** | Programa creado en DRAFT. |
| **Create Audit** | Auditoría creada desde programa. |
| **Planning** | Planificación con fechas y alcance. |
| **Assignment** | Asignación de equipo. |
| **Execution** | Ejecución con checklist y evidencias. |
| **Evidence** | Carga y vinculación de evidencias. |
| **Finding** | Registro de hallazgos. |
| **Report** | Generación de informe. |
| **Approval** | Aprobación por Quality Manager. |
| **Closure** | Cierre formal. |

---

## 31. Checklist Testing

### 31.1 Casos

| Caso | Descripción |
|---|---|
| **Incomplete checklist** | No permite cerrar auditoría. |
| **Complete checklist** | Todos los items revisados. |
| **N/A** | Items marcados como no aplicables. |
| **Finding** | Generación desde checklist item. |
| **Evidence** | Vinculación de evidencia por item. |
| **Concurrent editing** | Conflicto detectado. |

---

## 32. Finding Testing

### 32.1 Casos

| Caso | Descripción |
|---|---|
| **Valid finding** | Creado con criterio y evidencia. |
| **Missing criteria** | Rechazado. |
| **Missing evidence** | Rechazado o marcado como pendiente. |
| **Invalid classification** | Valores fuera de enum. |
| **Severity** | Severidad válida dentro del rango. |
| **Duplicate finding** | Detección de duplicados. |
| **Finding closure** | Cierre con verificación. |

---

## 33. Nonconformity Testing

### 33.1 Flujo

```
Finding (NON_CONFORMITY)
  → Nonconformity
    → Root Cause Analysis
      → Corrective Action
        → Verification
          → Closure
```

### 33.2 Casos

| Caso | Descripción |
|---|---|
| **Finding → NC** | Generación automática. |
| **Root cause** | Análisis registrado. |
| **Action** | Acción correctiva creada. |
| **Verification** | Verificación de efectividad. |
| **Closure** | Cierre formal. |

---

## 34. Corrective Action Testing

### 34.1 Casos

| Caso | Descripción |
|---|---|
| **Assignment** | Asignación a responsable. |
| **Due date** | Fecha límite respetada. |
| **Completion** | Marcado como completado. |
| **Verification** | Verificación por Quality Manager. |
| **Effectiveness** | Efectiva / Inefectiva / Parcial. |
| **Overdue** | Marcado como vencido. |
| **Rejection** | Rechazo y reapertura. |

---

## 35. Risk Testing

### 35.1 Casos

| Caso | Descripción |
|---|---|
| **Risk creation** | Creado con probability e impact. |
| **Score calculation** | Cálculo correcto del risk score. |
| **Level** | Nivel derivado correctamente. |
| **Treatment** | Plan de tratamiento creado. |
| **Residual risk** | Riesgo residual post-tratamiento. |
| **Reassessment** | Reevaluación actualiza score. |

### 35.2 Regla

Validar todos los límites y valores extremos (probability 0%, 100%, etc).

---

## 36. Training Testing

### 36.1 Casos

| Caso | Descripción |
|---|---|
| **Course** | Creación y metadata. |
| **Session** | Programación de sesión. |
| **Participant** | Inscripción. |
| **Attendance** | Registro de asistencia. |
| **Completion** | Finalización con evidencia. |
| **Overdue** | Capacitación vencida. |

---

## 37. Indicator Testing

### 37.1 Casos

| Caso | Descripción |
|---|---|
| **Measurement** | Registro de medición. |
| **Target** | Comparación contra objetivo. |
| **Period** | Periodicidad respetada. |
| **Calculation** | Fórmula aplicada correctamente. |
| **Trend** | Tendencia calculada. |
| **Invalid values** | Valores fuera de rango rechazados. |

---

## 38. Notification Testing

### 38.1 Casos

| Caso | Descripción |
|---|---|
| **Trigger** | Evento genera notificación. |
| **Recipient** | Usuario correcto notificado. |
| **Permission** | Solo usuarios autorizados ven notificación. |
| **Duplicate prevention** | No se duplica por mismo evento. |
| **Unread state** | Marcado como no leída. |
| **Read state** | Marcado como leída. |

---

## 39. Frontend Unit Testing

### 39.1 Alcance

Probar:

| Componente | Descripción |
|---|---|
| **Components** | Renderizado, props, eventos. |
| **Hooks** | Lógica reutilizable. |
| **Utilities** | Formatters, validators, helpers. |
| **Validators** | Reglas de validación client-side. |
| **Permission helpers** | `can()` y derivados. |
| **State logic** | Stores, máquinas de estado UI. |

---

## 40. Frontend Component Testing

### 40.1 Estados

| Estado | Descripción |
|---|---|
| **Loading** | Skeleton o spinner. |
| **Empty** | Sin datos, con acción. |
| **Populated** | Con datos. |
| **Error** | Mensaje de error y retry. |
| **Unauthorized** | Acceso denegado. |
| **Disabled** | Acciones bloqueadas. |

---

## 41. Frontend Workflow Testing

### 41.1 Document Workflow

```
Create → Submit → Review → Approve → Publish
```

### 41.2 Audit Workflow

```
Create → Execute → Finding → Close
```

### 41.3 Regla

Probar UI completa incluyendo estados intermedios y transiciones.

---

## 42. E2E Testing

### 42.1 Estrategia

Usar Playwright según `ARCHITECTURE.md` y `FRONTEND.md`.

### 42.2 Flujos Críticos

| ID | Flujo | Descripción |
|---|---|---|
| **E2E-001** | Login | Autenticación exitosa y redirección a dashboard. |
| **E2E-002** | Create Document | Crear borrador y validar estado. |
| **E2E-003** | Approve Document | Revisión y aprobación de documento. |
| **E2E-004** | Publish Document | Publicación y distribución. |
| **E2E-005** | Create Audit | Crear auditoría desde programa. |
| **E2E-006** | Execute Audit | Ejecutar checklist y agregar evidencias. |
| **E2E-007** | Create Finding | Generar hallazgo desde auditoría. |
| **E2E-008** | Corrective Action | Crear acción correctiva desde no conformidad. |
| **E2E-009** | Risk Assessment | Evaluar riesgo y crear tratamiento. |
| **E2E-010** | Training Completion | Completar capacitación y registrar asistencia. |

---

## 43. E2E Data Isolation

### 43.1 Requisito

E2E debe utilizar:

- Tenant A
- Tenant B

y demostrar aislamiento estricto.

### 43.2 Casos

| Caso | Descripción |
|---|---|
| **UserA → TenantA data** | Acceso permitido. |
| **UserA → TenantB data** | Acceso denegado. |
| **Cross-tenant search** | No retorna resultados mixtos. |
| **Cross-tenant export** | Exporta solo datos del tenant. |

---

## 44. Accessibility Testing

### 44.1 Objetivo

WCAG 2.2 AA como mínimo.

### 44.2 Casos

| Caso | Descripción |
|---|---|
| **Keyboard** | Navegación completa por teclado. |
| **Focus** | Orden de foco lógico. |
| **Labels** | Labels semánticos asociados. |
| **Forms** | Errores asociados a campos. |
| **Contrast** | Ratio mínimo 4.5:1. |
| **Screen reader** | ARIA labels correctos. |
| **Dialogs** | Focus trap y cierre accesible. |
| **Tables** | Headers y celdas accesibles. |

---

## 45. Responsive Testing

### 45.1 Dispositivos

| Dispositivo | Enfoque |
|---|---|
| **Desktop** | Layout completo. |
| **Tablet** | Adaptaciones menores. |
| **Mobile** | Usable, navegación accesible. |

### 45.2 Componentes Críticos

| Componente | Consideración |
|---|---|
| **Tables** | Horizontal scroll o cards. |
| **Forms** | Fields apilados, labels visibles. |
| **Navigation** | Menú colapsable. |
| **Modals** | Full screen en mobile. |
| **Audit checklist** | Navegación secuencial funcional. |

---

## 46. Browser Testing

### 46.1 Navegadores

Definir según `FRONTEND.md`.

### 46.2 Regla

No probar arbitrariamente todos los navegadores. Limitar a los soportados.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Performance, Observabilidad, CI/CD Pipeline y Definition of Done]

---

## 47. Performance Testing

### 47.1 Objetivos

Definir objetivos cuantificables para:

- API latency.
- DB query latency.
- Page load time.
- Frontend bundle size.
- Rendering time.
- Search response time.
- Large dataset handling.

### 47.2 Métricas

| Métrica | Objetivo |
|---|---|
| **API p50** | < 200ms |
| **API p95** | < 500ms |
| **API p99** | < 1000ms |
| **DB query p95** | < 100ms |
| **Page load** | < 2s |
| **Bundle size** | < 500KB initial |

---

## 48. Load Testing

### 48.1 Escenarios

| Escenario | Descripción |
|---|---|
| **Login** | 100 usuarios concurrentes. |
| **Dashboard** | 200 usuarios consultando métricas. |
| **Document search** | 50 búsquedas por segundo. |
| **Document retrieval** | 100 descargas por segundo. |
| **Audit listing** | 50 consultas por segundo. |

### 48.2 Métricas

- RPS (requests per second).
- p50, p95, p99 latency.
- Error rate.
- Throughput.

---

## 49. Stress Testing

### 49.1 Objetivo

Encontrar el punto de quiebre del sistema.

### 49.2 Procedimiento

- Aumentar carga gradualmente.
- Registrar throughput, latency, errors, CPU, memory, DB.

### 49.3 Resultado Esperado

- El sistema degrada gracefully.
- No hay data corruption.
- No hay security bypass.

---

## 50. Soak Testing

### 50.1 Objetivo

Evaluar comportamiento durante periodos prolongados.

### 50.2 Buscar

- Memory leaks.
- Connection leaks.
- Queue buildup.
- Degraded performance.

### 50.3 Duración

Mínimo 24 horas bajo carga sostenida.

---

## 51. Security Testing

### 51.1 Categorías

| Categoría | Descripción |
|---|---|
| **Authentication tests** | Login, MFA, sesiones. |
| **Authorization tests** | RBAC, ABAC, permisos. |
| **IDOR** | Acceso horizontal/vertical. |
| **Privilege escalation** | Elevación de roles. |
| **Injection** | SQLi, NoSQLi, command injection. |
| **XSS** | Stored, reflected, DOM. |
| **CSRF** | Protección de endpoints. |
| **SSRF** | Acceso a recursos internos. |
| **Path traversal** | Acceso a archivos fuera de allowed paths. |
| **File upload** | Validación de tipo, tamaño, contenido. |
| **Rate limiting** | Límites por usuario/IP. |
| **Session attacks** | Fixation, hijacking, replay. |

---

## 52. Injection Testing

### 52.1 Entradas a Probar

| Vector | Ejemplo |
|---|---|
| **Search** | `'; DROP TABLE documents; --` |
| **Filters** | `* OR 1=1` |
| **Forms** | `<script>alert(1)</script>` |
| **API** | `{"role": "ADMIN"}` en body |
| **File metadata** | Nombres con caracteres especiales |

### 52.2 Regla

Todas las entradas de usuario deben ser sanitizadas y validadas.

---

## 53. XSS Testing

### 53.1 Tipos

| Tipo | Descripción |
|---|---|
| **Stored XSS** | Script guardado en base de datos. |
| **Reflected XSS** | Script en query params. |
| **DOM XSS** | Manipulación del DOM cliente. |

### 53.2 Áreas Críticas

- Comments.
- Descriptions.
- Document metadata.
- Findings.
- Notes.

---

## 54. CSRF Testing

### 54.1 Estrategia

Según arquitectura de autenticación.

### 54.2 Validar

- Operaciones con estado requieren token CSRF o SameSite cookies.
- Requests desde origen no autorizado son rechazados.

---

## 55. Rate Limiting

### 55.1 Endpoints

| Endpoint | Límite |
|---|---|
| **Login** | 5 intentos por minuto. |
| **Password recovery** | 3 intentos por hora. |
| **MFA** | 5 intentos por minuto. |
| **Sensitive endpoints** | 100 requests por minuto. |
| **Public endpoints** | 200 requests por minuto. |

---

## 56. Session Security

### 56.1 Casos

| Caso | Descripción |
|---|---|
| **Expiration** | Token expirado invalida sesión. |
| **Revocation** | Logout revoca refresh token. |
| **Concurrent sessions** | Límite configurable. |
| **Token reuse** | Refresh token de un solo uso. |
| **Refresh behavior** | Access token renovado, refresh rotado. |

---

## 57. API Abuse Testing

### 57.1 Casos

| Caso | Descripción |
|---|---|
| **Excessive pagination** | Límite máximo de página. |
| **Huge payload** | Rechazado por tamaño. |
| **Repeated requests** | Rate limit aplicado. |
| **Invalid IDs** | UUIDs mal formados rechazados. |
| **Enumeration** | No se revela existencia de recursos. |
| **Bulk abuse** | Límite en operaciones masivas. |

---

## 58. Data Privacy Testing

### 58.1 Validar

- Least data exposure: respuestas solo con campos necesarios.
- Unauthorized exports: usuario no exporta datos de otro tenant.
- Logs without sensitive data: no passwords, tokens, secrets.
- Error messages without secrets: no stack traces, DB queries.

---

## 59. Regression Testing

### 59.1 Alcance

Toda nueva funcionalidad debe ejecutar:

- Unit suite completa.
- Integration suite relevante.
- E2E críticos afectados.
- Security suite.

### 59.2 Smoke Suite

Para despliegues rápidos:

- Application starts.
- DB connection.
- Authentication.
- Health endpoint.
- Basic API.
- Dashboard.
- Basic document access.

---

## 60. Smoke Testing

### 60.1 Checklist Mínimo

| Check | Descripción |
|---|---|
| **Application starts** | Servidor responde. |
| **DB connection** | Conexión válida. |
| **Authentication** | Login funciona. |
| **Health endpoint** | `/health` responde 200. |
| **Basic API** | Endpoint público responde. |
| **Dashboard** | Carga sin errores. |
| **Basic document access** | Lista de documentos accesible. |

---

## 61. Health Check Testing

### 61.1 Endpoints

| Endpoint | Propósito |
|---|---|
| **/health** | Application alive. |
| **/readiness** | Dependencies ready (DB, cache). |
| **/liveness** | Process alive. |

### 61.2 Regla

Diferenciar `application alive` de `application ready`.

---

## 62. Error Handling Testing

### 62.1 Validar

- Errores normalizados.
- No stack traces en producción.
- Correlation ID disponible.
- Información sensible oculta.

---

## 63. Observability Testing

### 63.1 Validar

| Elemento | Descripción |
|---|---|
| **Logs** | Estructurados, con nivel apropiado. |
| **Metrics** | Contadores, gauges, histogramas. |
| **Traces** | Distribuidos end-to-end. |
| **Correlation IDs** | Propagados en toda la cadena. |

### 63.2 Cadena

```
Frontend
→ API
→ Application
→ Database
→ Event
```

Una operación debe poder seguirse completa.

---

## 64. Disaster Recovery Testing

### 64.1 Alcance

Si está contemplado:

- Database backup.
- Restore.
- File storage recovery.
- Consistency verification.

### 64.2 Objetivos

| Métrica | Definir según requisitos |
|---|---|
| **RPO** | Recovery Point Objective. |
| **RTO** | Recovery Time Objective. |

---

## 65. Backup Testing

### 65.1 Procedimiento

```
Backup
→ Restore
→ Verification
```

### 65.2 Regla

Un backup no se considera válido simplemente porque se creó. Debe restaurarse y verificarse.

---

## 66. Data Consistency

### 66.1 Validar consistencia entre:

- Database.
- File Storage.
- Audit Trail.
- Events.

### 66.2 Especialmente

- Documentos y sus versiones.
- Evidencias y su hash.
- No conformidades y acciones correctivas.

---

## 67. Migration Rollback

### 67.1 Procedimiento

```
Migration
→ failure
→ rollback/recovery
```

### 67.2 Regla

Documentar límites reales de rollback. No todas las migraciones son reversibles.

---

## 68. Test Data

### 68.1 Datasets

| Dataset | Propósito |
|---|---|
| **Minimal** | Casos mínimos válidos. |
| **Normal** | Uso cotidiano. |
| **Large** | Volumen alto. |
| **Edge Case** | Valores límite. |
| **Invalid** | Datos inválidos para validación. |
| **Security** | Payloads maliciosos. |
| **Multi-Tenant** | Aislamiento entre tenants. |

### 68.2 Regla

No utilizar datos reales sin autorización. Sanitizar datos de producción.

---

## 69. Test Isolation

### 69.1 Requisitos

- Tests independientes.
- Limpiar datos después de cada test.
- Evitar dependencia del orden.
- Reproducibles en cualquier ambiente.

---

## 70. Determinism

### 70.1 Evitar

- Tests random sin seed.
- Dependencia de hora real.
- Dependencia de APIs externas.

### 70.2 Cuando sea necesario

- Clock abstraction.
- Deterministic data.

---

## 71. External Integrations

### 71.1 Integraciones Externas

- Email.
- Storage.
- Malware scanning.
- Notification provider.
- External identity provider.

### 71.2 Regla

Todas las integraciones externas deben poder mockearse en tests.

---

## 72. Contract Mocking

### 72.1 Regla

Los mocks deben respetar los contratos reales. No crear mocks incompatibles con `API_SPEC.md`.

---

## 73. Test Environments

### 73.1 Ambientes

| Ambiente | Propósito |
|---|---|
| **Local** | Desarrollo rápido. |
| **CI** | Pipeline automatizado. |
| **Staging** | Pre-producción. |
| **Production** | Solo monitoreo, nunca tests destructivos. |

---

## 74. CI Test Pipeline

### 74.1 Pipeline Conceptual

```
Lint
↓
Type Check
↓
Unit
↓
Integration
↓
Contract
↓
Security
↓
Build
↓
E2E
↓
Performance gates
```

### 74.2 Regla

No necesariamente todos en cada commit. Definir por nivel de cambio.

---

## 75. Test Levels by Pipeline

### 75.1 Pull Request

- Lint.
- Typecheck.
- Unit.
- Relevant integration.

### 75.2 Main

- Full unit.
- Integration.
- Contract.
- Build.

### 75.3 Release

- E2E.
- Security.
- Smoke.
- Performance.

---

## 76. Test Coverage

### 76.1 Filosofía

No perseguir únicamente 100% coverage. Definir cobertura por riesgo.

### 76.2 Alta Cobertura Requerida

- Security.
- Permissions.
- Tenant isolation.
- Domain rules.
- Financial/integrity-like calculations.
- Workflows.

---

## 77. Coverage Thresholds

### 77.1 Si se definen thresholds

| Métrica | Descripción |
|---|---|
| **Statements** | Porcentaje de statements cubiertos. |
| **Branches** | Porcentaje de branches cubiertos. |
| **Functions** | Porcentaje de funciones cubiertas. |
| **Lines** | Porcentaje de líneas cubiertas. |

### 77.2 Regla

Los thresholds deben ser realistas y por riesgo, no globales.

---

## 78. Quality Gates

### 78.1 Un release no debe continuar si:

- Critical tests fail.
- Security critical vulnerability.
- Tenant isolation fails.
- Migration fails.
- Build fails.
- Required E2E fails.

---

## 79. Flaky Tests

### 79.1 Manejo

- Detection.
- Quarantine.
- Root cause analysis.
- Repair.

### 79.2 Regla

No ocultar tests inestables simplemente desactivándolos. Investigar y corregir.

---

## 80. Test Reporting

### 80.1 Cada ejecución debe producir:

- Pass.
- Fail.
- Skipped.
- Duration.
- Coverage.
- Environment.

---

## 81. Defect Management

### 81.1 Cada defecto debe contener:

| Campo | Descripción |
|---|---|
| **Title** | Título descriptivo. |
| **Environment** | Ambiente donde se reprodujo. |
| **Reproduction** | Pasos para reproducir. |
| **Expected** | Comportamiento esperado. |
| **Actual** | Comportamiento actual. |
| **Severity** | Critical, High, Medium, Low. |
| **Priority** | Orden de corrección. |
| **Evidence** | Logs, screenshots, videos. |
| **Affected version** | Versión impactada. |

---

## 82. Severity

### 82.1 Niveles

| Nivel | Descripción |
|---|---|
| **Critical** | Bloquea producción, riesgo de seguridad o data loss. |
| **High** | Funcionalidad principal rota, workaround complejo. |
| **Medium** | Funcionalidad secundaria afectada, workaround posible. |
| **Low** | Cosmético o mejora. |

---

## 83. Bug Lifecycle

### 83.1 Estados

```
Open
→
Triaged
→
In Progress
→
Fixed
→
Verified
→
Closed
```

### 83.2 Regla

No crear estados incompatibles con workflows existentes.

---

## 84. Traceability

### 84.1 Matriz

```
Requirement
→ Business Rule
→ Test Case
→ Implementation
→ Evidence
```

### 84.2 Propósito

Demostrar que cada requisito y regla de negocio tiene tests demostrables.

---

## 85. Test Case Naming

### 85.1 Convención

| Prefijo | Módulo |
|---|---|
| **AUTH-** | Authentication. |
| **DOC-** | Documents. |
| **AUD-** | Audits. |
| **RISK-** | Risks. |
| **NC-** | Nonconformities. |
| **CA-** | Corrective Actions. |
| **TRN-** | Training. |
| **IND-** | Indicators. |
| **SEC-** | Security. |
| **TENANT-** | Multi-tenancy. |

---

## 86. Critical Test Suite

### 86.1 Suite: `CRITICAL`

Debe incluir:

- Authentication.
- Authorization.
- Tenant isolation.
- Document publication.
- Signatures.
- Audit closure.
- Nonconformity.
- Corrective action.
- Audit trail.

### 86.2 Regla

Esta suite debe ejecutarse en cada release. No puede ser opcional.

---

## 87. Release Testing

### 87.1 Antes de release

- Migration.
- Smoke.
- Regression.
- Security.
- E2E.
- Backup verification (si aplica).

---

## 88. Production Validation

### 88.1 Después de deploy

- Health.
- Readiness.
- Authentication.
- Core API.
- Database.
- Document retrieval.
- Monitoring.

---

## 89. Test Environment Data Security

### 89.1 Regla

No copiar datos sensibles de producción a ambientes de prueba sin controles y anonimización adecuada.

---

## 90. Definition of Done

### 90.1 Checklist

- [x] Testing pyramid definida.
- [x] Test categories definidas.
- [x] Unit testing definido.
- [x] Domain testing definido.
- [x] Workflow testing definido.
- [x] API testing definido.
- [x] Contract testing definido.
- [x] Authentication testing definido.
- [x] Authorization testing definido.
- [x] Multi-tenant testing definido.
- [x] IDOR testing definido.
- [x] Privilege escalation definido.
- [x] Database testing definido.
- [x] Migration testing definido.
- [x] Transaction testing definido.
- [x] Concurrency testing definido.
- [x] Idempotency testing definido.
- [x] Audit trail testing definido.
- [x] Document testing definido.
- [x] Audit testing definido.
- [x] Nonconformity testing definido.
- [x] Corrective action testing definido.
- [x] Risk testing definido.
- [x] Training testing definido.
- [x] Indicator testing definido.
- [x] Notification testing definido.
- [x] Frontend testing definido.
- [x] E2E definido.
- [x] Accessibility definido.
- [x] Responsive testing definido.
- [x] Performance testing definido.
- [x] Load testing definido.
- [x] Stress testing definido.
- [x] Soak testing definido.
- [x] Security testing definido.
- [x] XSS testing definido.
- [x] CSRF testing definido.
- [x] Rate limiting testing definido.
- [x] Session security definido.
- [x] API abuse definido.
- [x] Privacy testing definido.
- [x] Regression testing definido.
- [x] Smoke testing definido.
- [x] Health checks definidos.
- [x] Observability testing definido.
- [x] Disaster recovery definido.
- [x] Backup restore testing definido.
- [x] Data consistency definido.
- [x] Test data definido.
- [x] Determinism definido.
- [x] Integration mocking definido.
- [x] Test environments definidos.
- [x] CI pipeline definido.
- [x] Quality gates definidos.
- [x] Coverage strategy definida.
- [x] Flaky tests definidos.
- [x] Defect lifecycle definido.
- [x] Traceability definida.
- [x] Critical test suite definida.
- [x] Release testing definido.
- [x] Production validation definido.
- [x] No contradice SECURITY.md.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice WORKFLOW_SPEC.md.
- [x] No contradice DOCUMENT_MANAGEMENT.md.
- [x] No contradice AUDIT_SYSTEM.md.
- [x] No contradice FRONTEND.md.
- [x] No contradice DOMAIN.md.
- [x] No contradice API_SPEC.md.
- [x] No contradice DATABASE.md.
- [x] No contradice ARCHITECTURE.md.

TESTING.md generado. Listo para revisión.
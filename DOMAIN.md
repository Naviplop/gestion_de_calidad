# QMS Platform — Domain Model

## 1. Domain Conflicts

No se detectaron contradicciones entre `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API_SPEC.md` y `prisma/schema.prisma` que impidan definir el modelo de dominio en esta fase.

Si en fases futuras se detectan discrepancias entre el comportamiento de dominio definido aquí y los documentos fuente, se documentarán en la sección `DOMAIN_CONFLICT` con:
- fuente;
- sección;
- descripción del conflicto;
- impacto;
- recomendación.

---

## 2. Domain Principles

El dominio de QMS Platform representa un **Sistema de Gestión de la Calidad (SGC)** empresarial. Su propósito es digitalizar, controlar y trazar los procesos relacionados con marcos normativos como ISO 9001:2015, ISO 14001, ISO 45001 e ISO 27001.

Principios rectores:

1. **Trazabilidad extrema:** toda operación crítica genera evidencia inmutable de quién, cuándo y por qué ocurrió.
2. **Aislamiento estricto:** los datos de una organización nunca son visibles o modificables por otra.
3. **Inmutabilidad histórica:** las versiones documentales, las firmas y los registros de auditoría no se alteran ni eliminan.
4. **Comandos explícitos:** los cambios de estado relevantes son operaciones de negocio deliberadas, no actualizaciones implícitas.
5. **Separación de conceptos:** definición de configuración ≠ medición; aprobación ≠ publicación; completado ≠ verificado.
6. **Defensa en profundidad:** autenticación, autorización, tenant context, RLS y auditoría actúan como capas independientes.
7. **Independencia tecnológica:** el dominio describe comportamiento empresarial, no detalles de HTTP, PostgreSQL o NestJS.

---

## 3. Bounded Contexts

### 3.1 Identity & Access

**Propósito:** gestionar la identidad de los usuarios, su autenticación, credenciales y permisos efectivos dentro de una organización.

**Entidades principales:**
- User
- Role
- Permission
- UserRole
- MfaCredential
- RefreshToken

**Responsabilidades:**
- Autenticar usuarios.
- Emitir y rotar tokens.
- Gestionar MFA.
- Calcular permisos efectivos por usuario.
- Auditar eventos de autenticación y autorización.

**Dependencias:** Organization (tenant), Audit & Traceability.

**Eventos importantes:**
- `UserCreated`
- `UserActivated`
- `UserDeactivated`
- `MfaEnabled`
- `MfaDisabled`
- `RoleAssigned`
- `RoleRevoked`

---

### 3.2 Organization Management

**Propósito:** representar el tenant, su configuración, estructura organizacional y estándares adoptados.

**Entidades principales:**
- Organization
- OrganizationSetting
- Department
- Area
- Process

**Responsabilidades:**
- Aislar datos por organización.
- Gestionar configuración dinámica.
- Mantener estructura jerárquica de áreas, departamentos y procesos.
- Adoptar estándares ISO.

**Dependencias:** Identity & Access, ISO Compliance.

**Eventos importantes:**
- `OrganizationCreated`
- `OrganizationUpdated`
- `StandardAdopted`
- `StandardDeactivated`

---

### 3.3 Document Management

**Propósito:** gobernar el ciclo de vida completo de documentos controlados, desde su creación hasta su obsolescencia, garantizando versionado inmutable, aprobación formal y trazabilidad.

**Entidades principales:**
- Document
- DocumentVersion
- DocumentApproval
- DocumentDistribution
- DocumentAcknowledgement
- ElectronicSignatureEvent

**Responsabilidades:**
- Controlar estados documentales.
- Garantizar que cada modificación cree una nueva versión.
- Ejecutar flujos de revisión y aprobación.
- Distribuir versiones y registrar acuses.
- Generar evidencia de firma electrónica interna.
- Auditar toda operación.

**Dependencias:** Identity & Access, ISO Compliance, File Assets, Audit & Traceability.

**Eventos importantes:**
- `DocumentCreated`
- `DocumentSubmittedForReview`
- `DocumentApproved`
- `DocumentRejected`
- `DocumentPublished`
- `DocumentObsoleted`
- `DocumentVersionCreated`
- `DocumentSigned`

---

### 3.4 ISO Compliance

**Propósito:** modelar estándares, requisitos y su adopción por organización para sustentar auditorías y cumplimiento normativo.

**Entidades principales:**
- Standard
- StandardRequirement
- OrganizationStandard

**Responsabilidades:**
- Mantener catálogo global de estándares.
- Representar jerarquía de requisitos.
- Permitir que una organización adopte estándares con configuración propia.

**Dependencias:** Organization Management.

**Eventos importantes:**
- `StandardAdopted`
- `StandardConfigurationUpdated`

---

### 3.5 Audit Management

**Propósito:** planificar y ejecutar auditorías del SGC, documentando hallazgos y su relación con requisitos normativos.

**Entidades principales:**
- AuditProgram
- Audit
- AuditChecklist
- AuditChecklistItem
- AuditFinding

**Responsabilidades:**
- Planificar programas de auditoría por periodo.
- Ejecutar auditorías con alcance, objetivo y criterios.
- Construir listas de chequeo vinculables a requisitos.
- Registrar hallazgos con severidad y estado.
- Trazar hallazgos hacia no conformidades.

**Dependencias:** ISO Compliance, Identity & Access, Audit & Traceability.

**Eventos importantes:**
- `AuditProgramCreated`
- `AuditStarted`
- `AuditCompleted`
- `AuditCancelled`
- `FindingCreated`
- `FindingUpdated`

---

### 3.6 Nonconformity Management

**Propósito:** gestionar no conformidades desde su detección hasta su cierre, garantizando análisis de causa raíz y acciones correctivas efectivas.

**Entidades principales:**
- Nonconformity
- RootCauseAnalysis
- CorrectiveAction
- CorrectiveActionVerification

**Responsabilidades:**
- Registrar no conformidades.
- Exigir análisis de causa raíz antes de cerrar.
- Gestionar acciones correctivas con responsables y plazos.
- Verificar efectividad de acciones completadas.
- Impedir cierre sin cumplimiento de condiciones.

**Dependencias:** Audit Management, Identity & Access, Audit & Traceability.

**Eventos importantes:**
- `NonconformityCreated`
- `RootCauseAnalysed`
- `CorrectiveActionCreated`
- `CorrectiveActionCompleted`
- `CorrectiveActionVerified`
- `NonconformityClosed`

---

### 3.7 Corrective Actions

**Propósito:** modelar el ciclo de vida de las acciones correctivas derivadas de no conformidades, separando ejecución de verificación de efectividad.

**Entidades principales:**
- CorrectiveAction
- CorrectiveActionVerification

**Responsabilidades:**
- Asignar responsables y fechas.
- Registrar evidencia de ejecución.
- Verificar efectividad por actor independiente.
- Rechazar efectividad cuando la evidencia no es suficiente.

**Dependencias:** Nonconformity Management, Identity & Access.

**Eventos importantes:**
- `CorrectiveActionCreated`
- `CorrectiveActionCompleted`
- `CorrectiveActionVerifiedEffective`
- `CorrectiveActionVerifiedIneffective`

---

### 3.8 Risk Management

**Propósito:** identificar, evaluar, tratar y monitorear riesgos y oportunidades del SGC, con configuración dinámica de matrices.

**Entidades principales:**
- Risk
- RiskAssessment
- RiskTreatment

**Responsabilidades:**
- Registrar riesgos con tipo y owner.
- Calcular score según configuración dinámica del tenant.
- Definir estrategias de tratamiento.
- Monitorear residual y reevaluar.

**Dependencias:** Organization Management, Identity & Access, Process Management.

**Eventos importantes:**
- `RiskCreated`
- `RiskAssessed`
- `RiskTreatmentPlanned`
- `RiskTreatmentCompleted`
- `RiskReassessed`

---

### 3.9 Training

**Propósito:** gestionar capacitaciones, sesiones y asistencia para mantener competencias del personal.

**Entidades principales:**
- TrainingCourse
- TrainingSession
- TrainingParticipant

**Responsabilidades:**
- Definir cursos y su relación con documentos/procesos.
- Programar sesiones con instructor y ubicación.
- Registrar participantes, asistencia y evaluación.
- Generar historial de capacitación.

**Dependencias:** Document Management, Process Management, Identity & Access.

**Eventos importantes:**
- `TrainingCourseCreated`
- `TrainingSessionScheduled`
- `TrainingCompleted`
- `TrainingEvaluated`

---

### 3.10 Indicators

**Propósito:** definir indicadores de gestión, sus fórmulas de cálculo y registrar mediciones históricas.

**Entidades principales:**
- Indicator
- IndicatorMeasurement

**Responsabilidades:**
- Definir indicadores con unidad, target y fórmula.
- Registrar mediciones periódicas.
- Separar definición de resultados históricos.
- Permitir análisis de tendencias.

**Dependencias:** Process Management, Identity & Access.

**Eventos importantes:**
- `IndicatorCreated`
- `IndicatorMeasured`
- `IndicatorThresholdBreached`

---

### 3.11 Notifications

**Propósito:** notificar a los usuarios eventos relevantes del sistema de forma desacoplada.

**Entidades principales:**
- Notification
- NotificationPreference

**Responsabilidades:**
- Generar notificaciones por eventos de dominio.
- Respetar preferencias por tipo de notificación.
- Marcar lectura y mantener historial.

**Dependencias:** Todos los contextos anteriores como generadores de eventos.

**Eventos importantes:**
- `NotificationCreated`
- `NotificationRead`
- `NotificationPreferencesUpdated`

---

### 3.12 Audit & Traceability

**Propósito:** registrar immutadamente toda operación crítica para garantizar accountability y detección de alteraciones.

**Entidades principales:**
- AuditLog
- ElectronicSignatureEvent

**Responsabilidades:**
- Generar registros append-only por operación crítica.
- Mantener cadena de hash para detección de manipulación.
- Proveer consulta administrativa de solo lectura.
- Aislar tenant en toda consulta.

**Dependencias:** Todos los contextos.

**Eventos importantes:**
- `AuditLogCreated`
- `ElectronicSignatureCreated`
- `HashChainValidated`
- `TamperDetected`

---

## 4. Aggregates

### 4.1 Organization

**Aggregate Root:** `Organization`

**Entidades internas:**
- OrganizationSetting
- OrganizationStandard

**Invariantes:**
- Una organización existe independientemente de sus usuarios; eliminarla implica eliminar todo su dominio.
- El `name` y `taxId` deben mantenerse consistentes con el registro fiscal.
- La configuración global nunca puede referenciar claves de otra organización.
- Un estándar adoptado no puede adoptarse duplicadamente.

**Límites transaccionales:**
- Creación/actualización de organización + settings iniciales.
- Adopción/desactivación de estándares.

---

### 4.2 User

**Aggregate Root:** `User`

**Entidades internas:**
- MfaCredential
- MfaRecoveryCode
- RefreshToken

**Invariantes:**
- El email es único dentro de la organización mientras el usuario no esté eliminado.
- Un usuario inactivo o bloqueado no puede obtener tokens válidos.
- MFA no puede desactivarse sin verificación del factor.
- Un usuario no puede tener más de una credencial MFA activa.
- Los refresh tokens se rotan; el reuso invalida toda la sesión.

**Límites transaccionales:**
- Creación de usuario + asignación de roles iniciales.
- Cambio de estado (activar/desactivar/bloquear).
- Enrollment/disabling de MFA.

---

### 4.3 Document

**Aggregate Root:** `Document`

**Entidades internas:**
- DocumentVersion (histórica, inmutable)
- DocumentApproval
- DocumentDistribution
- DocumentAcknowledgement

**Invariantes:**
- Un documento siempre pertenece a una organización.
- El `code` es único dentro de la organización.
- Solo una versión puede estar vigente como `current_version_id`.
- Una versión publicada no puede modificarse; cualquier cambio requiere nueva versión.
- No se puede publicar sin aprobación.
- La firma registra el hash del contenido en el momento de la firma.
- Un acuse de recibo no puede duplicarse para la misma distribución y usuario.

**Límites transaccionales:**
- Creación de documento + primera versión.
- Transición de estado (submit, approve, reject, publish, obsolete, cancel).
- Distribución + generación de acuses.
- Firma electrónica.

---

### 4.4 Audit

**Aggregate Root:** `Audit`

**Entidades internas:**
- AuditChecklist
- AuditChecklistItem
- AuditFinding

**Invariantes:**
- Una auditoría pertenece a un programa o existe independientemente.
- Los hallazgos deben referenciar la auditoría que los generó.
- Una checklist eliminada no debe dejar huérfanos sus items sin protección histórica.
- El cierre de auditoría no elimina sus hallazgos.

**Límites transaccionales:**
- Creación de auditoría + checklists iniciales.
- Inicio/completado/cancelación de auditoría.
- Generación de hallazgos.

---

### 4.5 Nonconformity

**Aggregate Root:** `Nonconformity`

**Entidades internas:**
- RootCauseAnalysis (1:1)
- CorrectiveAction
- CorrectiveActionVerification

**Invariantes:**
- Una no conformidad no puede cerrarse sin análisis de causa raíz.
- No puede cerrarse si existen acciones correctivas sin verificar.
- El análisis de causa raíz es único por no conformidad.
- Una acción correctiva no se considera efectiva sin verificación formal.
- El cierre debe registrar quién y cuándo cerró.

**Límites transaccionales:**
- Creación de no conformidad.
- Registro de análisis de causa raíz.
- Creación y verificación de acciones correctivas.
- Cierre de no conformidad.

---

### 4.6 CorrectiveAction

**Aggregate Root:** `CorrectiveAction`

**Entidades internas:**
- CorrectiveActionVerification

**Invariantes:**
- El código de acción correctiva es único dentro de la organización.
- Una verificación no puede crearse si la acción no está completada.
- La efectividad es booleana en su resultado: efectiva o no efectiva.
- Si no es efectiva, debe generarse nueva acción o reabrir la existente.

**Límites transaccionales:**
- Completar acción + generar verificación.

---

### 4.7 Risk

**Aggregate Root:** `Risk`

**Entidades internas:**
- RiskAssessment
- RiskTreatment

**Invariantes:**
- El código de riesgo es único dentro de la organización.
- Un riesgo no puede evaluarse sin antes existir.
- El score se calcula backend; el cliente no lo determina.
- Un tratamiento completado no cierra automáticamente el riesgo; debe reevaluarse el residual.
- El riesgo residual debe compararse contra criterios de aceptación organizacionales.

**Límites transaccionales:**
- Creación de riesgo.
- Evaluación + cálculo de score.
- Planificación de tratamiento.
- Completado de tratamiento + re-evaluación.

---

### 4.8 TrainingCourse

**Aggregate Root:** `TrainingCourse`

**Entidades internas:**
- TrainingSession
- TrainingParticipant (clave compuesta: sessionId + userId)

**Invariantes:**
- Un curso pertenece a una organización.
- Una sesión pertenece a un curso; no puede existir sin curso.
- Un participante es único por sesión (no duplicados).
- La asistencia y evaluación pertenecen a la participación, no al usuario globalmente.

**Límites transaccionales:**
- Creación de curso.
- Programación de sesión + asignación de instructor.
- Registro de participantes + actualización de asistencia.

---

### 4.9 Indicator

**Aggregate Root:** `Indicator`

**Entidades internas:**
- IndicatorMeasurement

**Invariantes:**
- El código de indicador es único dentro de la organización.
- La definición del indicador (fórmula, unidad, target) no cambia por medir.
- Las mediciones son históricas; no se alteran.
- Una medición debe estar asociada a un indicador existente.

**Límites transaccionales:**
- Creación/actualización de definición.
- Registro de medición.

---

## 5. Organization

`Organization` representa el tenant. Es la raíz de aislamiento y configuración.

**Reglas:**
- Todos los datos tenant-scoped pertenecen a una organización.
- Ningún usuario puede acceder a recursos de otra organización.
- La organización puede estar activa o inactiva; si está inactiva, ningún usuario puede autenticarse.
- La configuración (`OrganizationSetting`) pertenece a la organización y controla comportamiento dinámico.
- El branding (`logoUrl`, `primaryColor`) pertenece a la organización.
- Los estándares adoptados (`OrganizationStandard`) pertenecen a la organización.

**Flujos:**
1. Se crea la organización.
2. Se asignan administradores iniciales.
3. Se configura branding y settings.
4. Se adoptan estándares.
5. Se crean usuarios, roles, procesos y documentos.

**Invariantes:**
- Una organización no puede eliminarse mientras tenga usuarios activos.
- El `taxId` debe ser único si se provee.

---

## 6. Users

`User` representa una persona física con acceso al sistema.

**Estados:**
- `ACTIVE`: puede autenticarse y operar.
- `INACTIVE`: no puede autenticarse; datos preservados.
- `LOCKED`: bloqueo temporal por intentos fallidos; no puede autenticarse hasta desbloqueo o expiración.
- `SUSPENDED`: inhabilitado por administrador; no puede autenticarse.

**Reglas:**
- El email es único dentro de la organización (único por tenant).
- El usuario debe pertenecer a una organización; no puede existir sin tenant.
- Un usuario inactivo o bloqueado no puede autenticarse.
- El cambio de roles requiere autorización administrativa.
- Las operaciones administrativas sobre usuarios deben auditarse.
- Un usuario no puede auto-asignarse roles ni elevar sus propios permisos.

**Invariantes:**
- `email` + `organizationId` identifican unívocamente al usuario activo.
- `failedLoginAttempts >= 5` implica `isLocked = true` y `lockedUntil` futuro.
- Un usuario eliminado lógicamente (`deletedAt`) no puede recuperar sus sesiones activas.

---

## 7. RBAC

### 7.1 Modelo Conceptual

El control de acceso se modela como:

```
User ──(1:N)──> UserRole <──(N:1)── Role ──(1:N)──> RolePermission <──(N:1)── Permission
```

- Un usuario puede tener múltiples roles.
- Un rol agrupa múltiples permisos.
- Los permisos efectivos del usuario son la unión de todos los permisos de sus roles activos.
- Los roles son tenant-scoped.

### 7.2 Permiso

`Permission` representa una capacidad atómica.

**Formato:** `{recurso}:{acción}`

Ejemplos:
- `documents:read`
- `documents:approve`
- `audits:execute`
- `nonconformities:close`
- `audit_logs:read`

**Reglas:**
- El `code` del permiso es único globalmente.
- Los permisos no pertenecen a una organización; son catálogo global.
- El acceso a permisos globales está regulado por permisos de sistema.

### 7.3 Rol

`Role` agrupa permisos para asignarlos colectivamente.

**Reglas:**
- El `name` es único dentro de la organización.
- Los roles `isSystem` no pueden eliminarse ni renombrarse.
- Un rol desactivado no puede asignarse a nuevos usuarios.
- Los cambios en roles se auditan.

### 7.4 Asignación de Roles

`UserRole` vincula un usuario con un rol.

**Reglas:**
- Un usuario no puede asignarse roles a sí mismo (`assignedBy` ≠ `userId`).
- Un usuario no puede asignar permisos superiores a los que posee.
- Solo roles con `roles:manage` pueden modificar asignaciones.
- Las asignaciones pueden tener expiración (`expiresAt`).

### 7.5 Authorization vs Authentication

- **Authentication:** verifica quién eres (JWT, MFA).
- **Authorization:** verifica qué puedes hacer (RBAC + tenant ownership + estado del recurso).

Toda operación requiere:
1. Autenticación válida.
2. Permiso explícito sobre el recurso.
3. Propiedad del tenant.
4. Estado válido del recurso para la operación.

---

## 8. Audit Management

### 8.1 AuditProgram

`AuditProgram` agrupa auditorías por periodo y objetivo estratégico.

**Propósito:** planificar el ciclo de auditorías internas de la organización.

**Reglas:**
- Pertenece a una organización.
- Tiene un `responsible` (responsable del programa).
- Define `periodStart` y `periodEnd`.
- `periodEnd >= periodStart` (invariante de negocio).
- El `status` puede ser `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

**Relaciones:**
- `AuditProgram` → `Audit` (1:N).

---

### 8.2 Audit

`Audit` representa una auditoría ejecutada o planificada.

**Propósito:** documentar el alcance, objetivo, criterios y resultados de una auditoría específica.

**Reglas:**
- Pertenece a una organización.
- Puede pertenecer a un `AuditProgram` (opcional).
- Se asocia a un `Process` (opcional) y un `leadAuditor` (opcional).
- El `code` es único dentro de la organización.
- Estados: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

**Invariantes:**
- Una auditoría no puede completarse sin fecha de fin real.
- Una auditoría cancelada no puede reactivarse; debe crearse una nueva.

**Relaciones:**
- `Audit` → `AuditChecklist` (1:N).
- `Audit` → `AuditFinding` (1:N).
- `Audit` → `AuditEvidence` (1:N).

---

### 8.3 AuditChecklist

`AuditChecklist` agrupa items de verificación para una auditoría.

**Propósito:** estructurar la evaluación mediante preguntas y criterios.

**Reglas:**
- Pertenece a una auditoría.
- Tiene un `name` identificador.

**Relaciones:**
- `AuditChecklist` → `AuditChecklistItem` (1:N).

---

### 8.4 AuditChecklistItem

`AuditChecklistItem` representa una pregunta o criterio de verificación dentro de una checklist.

**Propósito:** detallar qué se evalúa, contra qué requisito y qué evidencia se recaba.

**Reglas:**
- Pertenece a una `AuditChecklist`.
- Puede asociarse a un `StandardRequirement` (opcional).
- Tiene `question`, `response` (opcional), `evidence` (opcional), `comments` (opcional).
- `sortOrder` define el orden de presentación.

---

### 8.5 AuditFinding

`AuditFinding` representa un hallazgo derivado de una auditoría.

**Propósito:** documentar conformidades, no conformidades, observaciones u oportunidades de mejora.

**Reglas:**
- Pertenece a una auditoría.
- Puede referenciar un `AuditChecklistItem` y/o un `StandardRequirement`.
- Tipos conceptuales: `CONFORMITY`, `NON_CONFORMITY`, `OBSERVATION`, `OPPORTUNITY`.
- `identifiedBy` es el usuario que generó el hallazgo.
- `identifiedAt` es el timestamp de generación.
- Estados: `OPEN`, `REVIEWED`, `RESOLVED`.

**Invariantes:**
- Un hallazgo de tipo `NON_CONFORMITY` debe poder vincularse a una `Nonconformity`.
- No se puede modificar un hallazgo después de que la auditoría se cierre.

**Comandos:**
- `CreateAuditFinding`
- `UpdateAuditFinding`

---

## 9. Nonconformity Management

### 9.1 Nonconformity

`Nonconformity` representa una desviación identificada contra un requisito, proceso o estándar.

**Propósito:** formalizar y dar seguimiento a no conformidades hasta su cierre efectivo.

**Reglas:**
- Pertenece a una organización.
- Puede derivar de una `Audit`, `AuditFinding` o `Process`.
- El `code` es único dentro de la organización.
- `severity` define la importancia.
- `responsible` es el usuario a cargo del tratamiento.
- Estados: `OPEN`, `ANALYSIS`, `ACTION_PLANNED`, `IMPLEMENTATION`, `VERIFICATION`, `CLOSED`.

**Transiciones válidas:**
```
OPEN → ANALYSIS → ACTION_PLANNED → IMPLEMENTATION → VERIFICATION → CLOSED
```

**Invariantes:**
- No puede cerrarse sin `RootCauseAnalysis`.
- No puede cerrarse si existen `CorrectiveAction` pendientes de verificación.
- El cierre registra `closedBy` y `closedAt`.

**Comandos:**
- `CreateNonconformity`
- `StartAnalysis`
- `PlanCorrectiveActions`
- `CloseNonconformity`

---

### 9.2 RootCauseAnalysis

`RootCauseAnalysis` representa el análisis estructurado de la causa raíz de una no conformidad.

**Propósito:** evitar que la no conformidad se repita atacando la causa, no el síntoma.

**Reglas:**
- Relación 1:1 con `Nonconformity`.
- `methodology` define el enfoque: `FIVE_WHY`, `ISHIKAWA`, `FREE_FORM`.
- `analysisData` almacena el desglose estructurado (JSONB).
- `conclusion` resume la causa raíz identificada.

**Invariantes:**
- No puede existir sin `Nonconformity`.
- No puede haber más de un análisis por no conformidad.

---

### 9.3 CorrectiveAction

`CorrectiveAction` representa una acción concreta para eliminar la causa raíz de una no conformidad.

**Propósito:** planificar, ejecutar y verificar la efectividad de la acción correctiva.

**Reglas:**
- Pertenece a una `Nonconformity`.
- El `code` es único dentro de la organización.
- `responsible` es el ejecutor.
- `dueDate` es la fecha límite planeada.
- `effectivenessRequired` indica si requiere verificación explícita.
- Estados: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `VERIFIED`, `CLOSED`.

**Invariantes:**
- No puede verificarse sin estar `COMPLETED`.
- Si `effectivenessRequired = true`, debe tener al menos una verificación antes de cerrar.

**Comandos:**
- `CreateCorrectiveAction`
- `StartCorrectiveAction`
- `CompleteCorrectiveAction`
- `VerifyCorrectiveAction`

---

### 9.4 CorrectiveActionVerification

`CorrectiveActionVerification` representa la verificación formal de la efectividad de una acción correctiva.

**Propósito:** confirmar objetivamente que la acción eliminó la causa raíz y previene recurrencia.

**Reglas:**
- Pertenece a una `CorrectiveAction`.
- `verifier` es el usuario independiente que verifica.
- `effectivenessStatus` indica el resultado: `EFFECTIVE`, `INEFFECTIVE`.
- `evidence` y `comments` documentan la verificación.

**Invariantes:**
- No puede crearse si la acción no está `COMPLETED`.
- Si `INEFFECTIVE`, debe reabrirse la acción correctiva o crearse una nueva.

---

## 10. Risk Management

### 10.1 Risk

`Risk` representa un riesgo u oportunidad para el SGC.

**Propósito:** identificar y tratar factores que puedan afectar el cumplimiento de objetivos de calidad.

**Reglas:**
- Pertenece a una organización.
- Puede asociarse a un `Process` (opcional).
- El `code` es único dentro de la organización.
- `riskType` clasifica el riesgo (ej: `INTERNAL`, `EXTERNAL`, `OPPORTUNITY`).
- `owner` es el responsable del tratamiento.
- Estados: `IDENTIFIED`, `ASSESSED`, `TREATMENT_PLANNED`, `UNDER_CONTROL`, `CLOSED`.

**Relaciones:**
- `Risk` → `RiskAssessment` (1:N).
- `Risk` → `RiskTreatment` (1:N).

---

### 10.2 RiskAssessment

`RiskAssessment` representa una evaluación cuantitativa o cualitativa de un riesgo.

**Propósito:** determinar la probabilidad, impacto y score del riesgo según la configuración dinámica del tenant.

**Reglas:**
- Pertenece a un `Risk`.
- `probability` e `impact` son valores definidos por la configuración del tenant.
- `score` se calcula backend; no es editable por cliente.
- `calculationData` almacena parámetros de cálculo (JSONB).
- `assessedBy` es el evaluador.

**Invariantes:**
- No puede existir sin `Risk`.
- El score debe respetar la fórmula configurada en `organization_settings`.

---

### 10.3 RiskTreatment

`RiskTreatment` representa una medida para modificar el riesgo.

**Propósito:** planificar y ejecutar estrategias que modifiquen probabilidad, impacto o ambos.

**Reglas:**
- Pertenece a un `Risk`.
- `strategy` define la estrategia: `AVOID`, `MITIGATE`, `TRANSFER`, `ACCEPT`, `EXPLOIT`, `ENHANCE`, `SHARE`.
- `responsible` es el ejecutor.
- `dueDate` es la fecha límite.
- `completedAt` registra la finalización.
- Estados: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

**Invariantes:**
- Un tratamiento completado no cierra automáticamente el riesgo; debe reevaluarse el residual.
- El riesgo residual debe compararse contra criterios de aceptación organizacionales.

**Comandos:**
- `CreateRiskTreatment`
- `CompleteRiskTreatment`
- `ReassessRisk`

---

## 11. Training

### 11.1 TrainingCourse

`TrainingCourse` representa una capacitación formal del SGC.

**Propósito:** definir un curso con contenido, objetivo y relación con documentos/procesos.

**Reglas:**
- Pertenece a una organización.
- Puede asociarse a un `Document` (opcional) y un `Process` (opcional).
- `isActive` controla si el curso está disponible.

**Relaciones:**
- `TrainingCourse` → `TrainingSession` (1:N).

---

### 11.2 TrainingSession

`TrainingSession` representa una instancia programada de un curso.

**Propósito:** concretar la ejecución de una capacitación en fecha, lugar y con instructor.

**Reglas:**
- Pertenece a una organización y un `TrainingCourse`.
- `instructor` es el usuario responsable de dictar la sesión.
- `scheduledAt` es la fecha y hora programada.
- `location` es el lugar o enlace.
- Estados: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

**Relaciones:**
- `TrainingSession` → `TrainingParticipant` (1:N).

---

### 11.3 TrainingParticipant

`TrainingParticipant` representa la inscripción y resultado de un usuario en una sesión.

**Propósito:** registrar asistencia, completitud y evaluación por participante.

**Reglas:**
- Clave compuesta: `(sessionId, userId)`.
- `attendanceStatus`: `PENDING`, `PRESENT`, `ABSENT`, `JUSTIFIED`.
- `completedAt` registra cuando completó la capacitación.
- `evaluationScore` almacena el resultado de la evaluación.

**Invariantes:**
- Un usuario no puede registrarse dos veces en la misma sesión.
- La asistencia y evaluación pertenecen a la participación, no al usuario globalmente.

---

## 12. Indicators

### 12.1 Indicator

`Indicator` representa la definición de un indicador de gestión.

**Propósito:** establecer métricas, unidades, targets y fórmulas de cálculo para medir desempeño.

**Reglas:**
- Pertenece a una organización.
- Puede asociarse a un `Process` (opcional).
- El `code` es único dentro de la organización.
- `unit` define la unidad de medida.
- `targetValue` define la meta.
- `calculationDefinition` almacena la fórmula y configuración dinámica (JSONB).
- `responsible` es el usuario encargado de su seguimiento.
- Estados: `ACTIVE`, `INACTIVE`, `ARCHIVED`.

**Relaciones:**
- `Indicator` → `IndicatorMeasurement` (1:N).

---

### 12.2 IndicatorMeasurement

`IndicatorMeasurement` representa una medición histórica de un indicador.

**Propósito:** registrar el valor observado en una fecha determinada.

**Reglas:**
- Pertenece a una organización y un `Indicator`.
- `measurementDate` es la fecha de la medición.
- `value` es el valor numérico/texto registrado.
- `targetValue` puede registrar la meta aplicable en ese momento.
- `comments` permite observaciones.

**Invariantes:**
- No se puede modificar una medición histórica.
- Una medición debe estar asociada a un indicador existente y activo.

---

## 13. Notifications

### 13.1 Notification

`Notification` representa una notificación generada por el sistema para un usuario.

**Propósito:** informar eventos relevantes sin acoplar la lógica de negocio a la entrega.

**Reglas:**
- Pertenece a una organización y un usuario destinatario.
- `type` clasifica la notificación (ej: `AUDIT_ASSIGNED`, `DOCUMENT_APPROVED`).
- `entityType` y `entityId` permiten navegar al recurso relacionado.
- `readAt` registra la lectura; si es null, está pendiente.

**Invariantes:**
- No contiene lógica empresarial crítica; es un mecanismo de informes.
- No se eliminan automáticamente; se archivan según política de retención.

---

### 13.2 NotificationPreference

`NotificationPreference` representa las preferencias de notificación de un usuario por tipo.

**Propósito:** permitir que cada usuario controle cómo desea recibir cada categoría de notificación.

**Reglas:**
- La combinación `(userId, notificationType)` es única.
- `inAppEnabled` controla notificaciones dentro de la plataforma.
- `emailEnabled` controla envío por correo.

---

## 14. Audit Log (Read-Only Domain View)

### 14.1 AuditLog

`AuditLog` representa un registro inmutable de una operación crítica.

**Propósito:** garantizar accountability, trazabilidad y detección de manipulaciones.

**Reglas:**
- Es append-only; no se actualiza ni elimina desde la capa de aplicación.
- Pertenece a una organización.
- `actorId` es el usuario que ejecutó la acción (opcional para eventos system).
- `action` codifica el evento (ej: `DOCUMENT_APPROVED`).
- `entityType` y `entityId` identifican el recurso afectado.
- `payload` almacena valores anteriores/nuevos en JSONB.
- `correlationId` permite trazar la request completa.
- `previousHash` y `eventHash` forman la cadena de hash.
- `createdAt` es el timestamp del evento.

**Invariantes:**
- No se puede modificar ni eliminar.
- La cadena de hash debe validarse periódicamente para detectar alteraciones.
- El acceso es de solo lectura para administradores de auditoría.

**Eventos típicos:**
- `LOGIN_SUCCESS`, `LOGIN_FAILED`
- `DOCUMENT_CREATED`, `DOCUMENT_APPROVED`, `DOCUMENT_PUBLISHED`
- `AUDIT_STARTED`, `AUDIT_COMPLETED`
- `NONCONFORMITY_CREATED`, `NONCONFORMITY_CLOSED`
- `CORRECTIVE_ACTION_COMPLETED`, `CORRECTIVE_ACTION_VERIFIED`
- `ELECTRONIC_SIGNATURE_CREATED`

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Máquinas de Estado, Eventos, Comandos, Errores y Checklist]

## 8. File Assets

`FileAsset` representa un archivo almacenado en S3/MinIO junto con sus metadatos de control.

**Propósito:** proveer trazabilidad y control de archivos sin almacenar binarios en PostgreSQL.

**Reglas:**
- PostgreSQL nunca almacena blobs ni binarios; solo metadatos.
- Cada archivo se almacena en S3/MinIO con un `objectKey` único dentro del tenant.
- El `sha256Hash` permite detectar alteraciones del contenido.
- El backend genera el `objectKey`; el cliente nunca elige rutas arbitrarias.
- Las descargas requieren autenticación y generan URLs presignadas con expiración corta.
- Todo upload y download se audita.

**Invariantes:**
- `(storageProvider, bucketName, objectKey)` es único globalmente.
- Un `FileAsset` no puede eliminarse mientras esté referenciado por una versión de documento activa o por entidades históricas.
- El `originalFilename` no se usa para generar rutas; solo para mostrar al usuario.

**Relaciones:**
- Pertenece a una `Organization`.
- Creado por un `User`.
- Referenciado por `DocumentVersion`, `AuditEvidence`, `ActionEvidence`, `TrainingEvidence`.

---

## 9. Process Management

### 9.1 Process

`Process` representa un proceso del SGC.

**Propósito:** modelar los procesos de la organización que requieren control, auditoría, riesgos, documentos e indicadores.

**Reglas:**
- El `code` es único dentro de la organización.
- Un proceso puede tener un proceso padre (jerarquía).
- Un proceso pertenece a un `Area`.
- Un proceso tiene un `owner` (responsable).
- Un proceso inactivo no debe asignarse a documentos nuevos.

**Invariantes:**
- No puede existir un ciclo en la jerarquía de procesos.
- Un proceso no puede ser su propio padre.

### 9.2 Department

`Department` representa un departamento organizacional.

**Reglas:**
- El `name` es único dentro de la organización.
- Puede tener jerarquía (departamentos padre/hijos).
- Pertenece a una organización.

### 9.3 Area

`Area` representa un área de la organización.

**Reglas:**
- El `name` es único dentro de la organización.
- Puede tener jerarquía (áreas padre/hijas).
- Tiene un `manager` (opcional).
- Pertenece a una organización.

**Relaciones:**
- `Area` → `Process` (un área puede tener muchos procesos).
- `Process` → `Document`, `Audit`, `Nonconformity`, `Risk`, `Indicator`, `TrainingCourse`.

---

## 10. ISO Standards

### 10.1 Standard

`Standard` representa un catálogo global de normas ISO.

**Propósito:** mantener un catálogo de estándares soportados por el sistema.

**Reglas:**
- El `code` es único globalmente.
- Es de lectura general; no es tenant-scoped.
- Puede tener múltiples requisitos jerárquicos.

### 10.2 StandardRequirement

`StandardRequirement` representa una cláusula o requisito de un estándar.

**Propósito:** modelar la estructura jerárquica de requisitos normativos.

**Reglas:**
- El `code` es único dentro del `standard`.
- Puede tener un `parentRequirement` (jerarquía).
- Pertenece a un `Standard`.
- No puede existir sin un `Standard`.

**Invariantes:**
- No puede existir un ciclo en la jerarquía de requisitos.

### 10.3 OrganizationStandard

`OrganizationStandard` representa la adopción de un estándar por una organización.

**Propósito:** permitir que cada organización adopte estándares con configuración propia.

**Reglas:**
- La combinación `(organizationId, standardId)` es única.
- Una organización puede adoptar el mismo estándar solo una vez.
- La adopción puede activarse/desactivarse sin eliminarse.

**Relaciones:**
- `Organization` → `OrganizationStandard` (1:N).
- `Standard` → `OrganizationStandard` (1:N).

---

## 11. Document Management

### 11.1 Document

`Document` es el agregado principal de la gestión documental.

**Propósito:** representar un documento controlado del SGC con ciclo de vida, versionado inmutable, aprobación formal y trazabilidad.

**Estados:**
- `DRAFT`: borrador inicial.
- `IN_REVIEW`: en revisión por revisores designados.
- `PENDING_APPROVAL`: pendiente de aprobación final.
- `APPROVED`: aprobado, listo para publicar.
- `PUBLISHED`: publicado y vigente.
- `OBSOLETE`: obsoleto, histórico.
- `CANCELLED`: cancelado antes de completar el ciclo.

**Reglas:**
- El `code` es único dentro de la organización.
- Pertenece a una organización, un proceso (opcional), un área (opcional), un owner y un responsible.
- Tiene clasificación y confidencialidad.
- El `current_version_id` apunta a la versión vigente (una sola).
- Un documento inactivo (`isActive=false`) no debe aparecer en listados activos.

**Transiciones válidas:**
```
DRAFT → IN_REVIEW → PENDING_APPROVAL → APPROVED → PUBLISHED → OBSOLETE
                                         ↘ REJECTED → DRAFT
DRAFT → CANCELLED
IN_REVIEW → CANCELLED
PENDING_APPROVAL → CANCELLED (por rechazo explícito)
APPROVED → CANCELLED (antes de publicar)
PUBLISHED → OBSOLETE
```

**Invariantes:**
- No se puede publicar sin aprobación.
- No se puede aprobar sin estar en `PENDING_APPROVAL`.
- No se puede enviar a revisión sin al menos una versión.
- Una vez `PUBLISHED`, no se puede volver a `DRAFT`; debe crearse una nueva versión.

**Comandos:**
- `CreateDocument`
- `SubmitDocumentForReview`
- `ApproveDocument`
- `RejectDocument`
- `PublishDocument`
- `ObsoleteDocument`
- `CancelDocument`
- `UpdateDocumentMetadata`

---

### 11.2 DocumentVersion

`DocumentVersion` representa una versión histórica e inmutable de un documento.

**Propósito:** garantizar que cada modificación preserve el historial completo y permita trazabilidad.

**Reglas:**
- Cada versión pertenece a un `Document`.
- `versionMajor >= 1`, `versionMinor >= 0`.
- `(documentId, versionMajor, versionMinor)` es único.
- Una versión publicada es inmutable; no se actualiza ni elimina.
- Todo cambio requiere crear una nueva versión.
- Cada versión registra quién la creó, quién la aprobó y cuándo.
- El `fileHash` (SHA-256) permite detectar alteraciones del archivo.

**Invariantes:**
- No se puede modificar una versión después de `PUBLISHED`.
- No se puede crear una versión con número duplicado.
- El `fileAsset` asociado no puede eliminarse mientras la versión exista.

**Comandos:**
- `CreateDocumentVersion`
- `SubmitVersionForReview`
- `ApproveVersion`
- `RejectVersion`
- `PublishVersion`

---

### 11.3 DocumentApproval

`DocumentApproval` representa una aprobación individual dentro del flujo de aprobación de una versión.

**Propósito:** registrar la decisión de un aprobador designado sobre una versión específica.

**Reglas:**
- Cada aprobación pertenece a una `DocumentVersion`.
- Un aprobador puede tener una secuencia de aprobación.
- El estado puede ser `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
- Una aprobación no puede alterarse después de decidida.

**Invariantes:**
- No se puede aprobar una versión que no esté en `PENDING_APPROVAL`.
- No se puede rechazar sin comentario (si el flujo lo requiere).

---

### 11.4 DocumentDistribution

`DocumentDistribution` representa la asignación de una versión de documento a un usuario, departamento o rol.

**Propósito:** garantizar que los destinatarios correctos reciban la versión vigente y registren su acuse.

**Reglas:**
- Pertenece a un `Document` y una `DocumentVersion`.
- El destinatario puede ser un usuario, un departamento o un rol.
- No se duplican destinatarios para la misma versión.

---

### 11.5 DocumentAcknowledgement

`DocumentAcknowledgement` representa el acuse de recibo de un destinatario.

**Propósito:** registrar que un usuario leyó y aceptó un documento distribuido.

**Reglas:**
- Pertenece a una `DocumentDistribution`.
- Un usuario solo puede acusar una vez por distribución.
- Registra IP, user agent y timestamp.

**Invariantes:**
- No se puede duplicar `(documentDistributionId, userId)`.

---

### 11.6 ElectronicSignatureEvent

`ElectronicSignatureEvent` representa una firma/confirmación electrónica interna sobre una entidad.

**Propósito:** generar evidencia inmutable de que un actor autenticado aprobó una entidad en un momento dado.

**Reglas:**
- No constituye firma electrónica avanzada ni cualificada.
- Registra el hash del contenido firmado y el hash del evento.
- Es append-only; no se modifica ni elimina.
- Se asocia a un `User`, una entidad (`entityType`, `entityId`) y una acción.

**Invariantes:**
- El `signedContentHash` debe coincidir con el hash del contenido en el momento de la firma.
- El `signatureHash` permite detectar manipulación del registro.

---

## 12. Document Workflows & Optimistic Locking

### 12.1 Regla de Operaciones Explícitas

Los cambios de estado relevantes no se realizan mediante `PATCH` genérico. Se modelan como comandos explícitos:

- `POST /documents/:id/submit`
- `POST /documents/:id/approve`
- `POST /documents/:id/reject`
- `POST /documents/:id/publish`
- `POST /documents/:id/obsolete`
- `POST /documents/:id/cancel`

Esto garantiza que cada transición sea una operación de negocio deliberada, con validaciones, auditoría y eventos de dominio.

### 12.2 Optimistic Locking

Las operaciones de actualización y workflow utilizan optimistic locking para detectar modificaciones concurrentes.

**Mecanismo:**
- El cliente envía el valor conocido de `updatedAt` en el header `If-Match`.
- El backend compara con el valor actual; si difiere, retorna `409 ConcurrentUpdate`.

**Recursos sujetos:**
- Documents
- DocumentVersions
- DocumentApprovals
- Nonconformities
- CorrectiveActions
- Risks

### 12.3 Flujo de Aprobación

1. **Submit:** `DRAFT` → `IN_REVIEW`. Se asignan revisores.
2. **Review:** revisores completan su evaluación.
3. **Approve:** `PENDING_APPROVAL` → `APPROVED`. Solo aprobadores designados.
4. **Reject:** `PENDING_APPROVAL` → `REJECTED`. Requiere comentario.
5. **Publish:** `APPROVED` → `PUBLISHED`. Actualiza `current_version_id`.
6. **Obsolete:** `PUBLISHED` → `OBSOLETE`. Requiere motivo.
7. **Cancel:** estados intermedios → `CANCELLED`.

Cada transición:
- Valida estado actual.
- Verifica permiso del actor.
- Registra evento de dominio.
- Genera audit log.
- Actualiza `updatedAt`.

### 12.4 Firma Electrónica en Workflow

La firma puede ocurrir en puntos específicos del workflow:

- Aprobación final de versión.
- Publicación de documento.
- Cierre de no conformidad.
- Verificación de acción correctiva.

La firma:
- No modifica la entidad firmada.
- Genera un `ElectronicSignatureEvent` independiente.
- Registra hash del contenido, IP, user agent, timestamp.
- Es inmutable.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Auditorías, No Conformidades, Riesgos, Capacitaciones, Indicadores y Notificaciones]

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Gestión Documental y Normativa ISO]

---

## 15. Domain Events

Los eventos de dominio representan hechos relevantes del negocio que ya ocurrieron. Son inmutables y se registran en el Audit Log cuando corresponda.

### 15.1 Catálogo de Eventos

| Evento | Aggregate | Trigger | Payload conceptual | Consumidores potenciales | Audit requirement |
|---|---|---|---|---|---|
| `UserCreated` | User | Comando CreateUser | userId, email, organizationId, createdBy | Notifications, RBAC | yes |
| `UserActivated` | User | Comando ActivateUser | userId, activatedBy | Notifications | yes |
| `UserDeactivated` | User | Comando DeactivateUser | userId, deactivatedBy, reason | Notifications, RBAC | yes |
| `MfaEnabled` | User | Comando EnrollMfa | userId, enrolledAt | Notifications | yes |
| `MfaDisabled` | User | Comando DisableMfa | userId, disabledBy | Notifications, Security | yes |
| `RoleAssigned` | User | Comando AssignRoles | userId, roleIds, assignedBy | RBAC, Notifications | yes |
| `RoleRevoked` | User | Comando RevokeRole | userId, roleId, revokedBy | RBAC, Notifications | yes |
| `DocumentCreated` | Document | Comando CreateDocument | documentId, code, organizationId, createdBy | Notifications | yes |
| `DocumentSubmittedForReview` | Document | Comando SubmitDocumentForReview | documentId, previousStatus, newStatus, submittedBy | Notifications | yes |
| `DocumentApproved` | Document | Comando ApproveDocument | documentId, previousStatus, newStatus, approvedBy, comment | Notifications, AuditLog | yes |
| `DocumentRejected` | Document | Comando RejectDocument | documentId, previousStatus, newStatus, rejectedBy, comment | Notifications | yes |
| `DocumentPublished` | Document | Comando PublishDocument | documentId, publishedAt, publishedBy | Notifications, Distribution | yes |
| `DocumentObsoleted` | Document | Comando ObsoleteDocument | documentId, reason, obsoletedBy | Notifications | yes |
| `DocumentCancelled` | Document | Comando CancelDocument | documentId, reason, cancelledBy | Notifications | yes |
| `DocumentVersionCreated` | Document | Comando CreateDocumentVersion | documentId, versionId, versionMajor, versionMinor, createdBy | Notifications | yes |
| `DocumentSigned` | Document | Comando SignDocumentVersion | versionId, userId, action, signedContentHash | AuditLog | yes |
| `AuditProgramCreated` | AuditProgram | Comando CreateAuditProgram | auditProgramId, organizationId, createdBy | Notifications | yes |
| `AuditStarted` | Audit | Comando StartAudit | auditId, startedBy, actualStart | Notifications | yes |
| `AuditCompleted` | Audit | Comando CompleteAudit | auditId, completedBy, actualEnd | Notifications | yes |
| `AuditCancelled` | Audit | Comando CancelAudit | auditId, cancelledBy, reason | Notifications | yes |
| `FindingCreated` | AuditFinding | Comando CreateAuditFinding | findingId, auditId, findingType, severity, identifiedBy | Notifications, Nonconformity | yes |
| `NonconformityCreated` | Nonconformity | Comando CreateNonconformity | nonconformityId, code, severity, detectedAt, createdBy | Notifications, CorrectiveAction | yes |
| `RootCauseAnalysed` | RootCauseAnalysis | Comando PerformRootCauseAnalysis | nonconformityId, methodology, conclusion, createdBy | Notifications | yes |
| `CorrectiveActionCreated` | CorrectiveAction | Comando CreateCorrectiveAction | correctiveActionId, nonconformityId, code, responsibleId, dueDate, createdBy | Notifications | yes |
| `CorrectiveActionCompleted` | CorrectiveAction | Comando CompleteCorrectiveAction | correctiveActionId, completedBy, completedAt | Notifications, Verification | yes |
| `CorrectiveActionVerified` | CorrectiveActionVerification | Comando VerifyCorrectiveAction | correctiveActionId, verifierId, effectivenessStatus, evidence | Notifications, Nonconformity | yes |
| `RiskCreated` | Risk | Comando CreateRisk | riskId, code, riskType, ownerId, createdBy | Notifications | yes |
| `RiskAssessed` | RiskAssessment | Comando AssessRisk | riskId, assessmentId, probability, impact, score, assessedBy | Notifications | yes |
| `RiskTreatmentPlanned` | RiskTreatment | Comando CreateRiskTreatment | riskId, treatmentId, strategy, responsibleId, dueDate, createdBy | Notifications | yes |
| `RiskTreatmentCompleted` | RiskTreatment | Comando CompleteRiskTreatment | riskId, treatmentId, completedBy, completedAt | Notifications, Reassessment | yes |
| `TrainingCourseCreated` | TrainingCourse | Comando CreateTrainingCourse | courseId, name, relatedDocumentId, createdBy | Notifications | yes |
| `TrainingSessionScheduled` | TrainingSession | Comando ScheduleTrainingSession | sessionId, courseId, scheduledAt, instructorId, createdBy | Notifications | yes |
| `TrainingCompleted` | TrainingSession | Comando CompleteTrainingSession | sessionId, completedAt | Notifications | yes |
| `IndicatorCreated` | Indicator | Comando CreateIndicator | indicatorId, code, name, unit, targetValue, createdBy | Notifications | yes |
| `IndicatorMeasured` | IndicatorMeasurement | Comando RecordIndicatorMeasurement | measurementId, indicatorId, measurementDate, value, recordedBy | Notifications | yes |
| `NotificationCreated` | Notification | Evento interno | notificationId, userId, type, entityType, entityId | Notifications | no |
| `NotificationRead` | Notification | Comando MarkNotificationRead | notificationId, readAt | - | no |

---

## 16. Domain Commands

Los comandos representan intenciones explícitas del usuario o sistema para cambiar el estado del dominio.

### 16.1 Identity & Access Commands

**CreateUser**
- Actor: Admin de organización.
- Preconditions: permiso `users:create`; organización activa.
- Operation: crear usuario con email, passwordHash, datos personales y roles iniciales.
- Invariants: email único dentro de la organización; password cumple política.
- Result: `UserCreated` event.
- Audit: sí.

**ActivateUser**
- Actor: Admin de organización.
- Preconditions: usuario existe y está inactivo.
- Operation: establecer `isActive = true`, limpiar `deletedAt`.
- Invariants: usuario no puede auto-activarse.
- Result: `UserActivated` event.
- Audit: sí.

**DeactivateUser**
- Actor: Admin de organización.
- Preconditions: usuario existe y está activo.
- Operation: establecer `isActive = false`, `deletedAt = now()`.
- Invariants: no se puede desactivar el último admin activo.
- Result: `UserDeactivated` event.
- Audit: sí.

**AssignRoles**
- Actor: Admin de organización.
- Preconditions: `users:assignRoles`; usuario destino existe.
- Operation: crear `UserRole` por cada rol asignado.
- Invariants: `assignedBy != userId`; roles existen en el mismo tenant.
- Result: `RoleAssigned` event por cada rol.
- Audit: sí.

**RevokeRole**
- Actor: Admin de organización.
- Preconditions: `users:assignRoles`; asignación existe.
- Operation: eliminar `UserRole`.
- Invariants: no se puede revocar el último rol de admin si deja al tenant sin admins.
- Result: `RoleRevoked` event.
- Audit: sí.

**EnrollMfa**
- Actor: Usuario autenticado o admin.
- Preconditions: usuario autenticado; permiso `mfa:manage`.
- Operation: generar secret TOTP, hashear backup codes, marcar `mfaEnabled = false` hasta verificación.
- Invariants: un usuario no puede tener múltiples credenciales MFA activas.
- Result: `MfaEnabled` event tras verificación.
- Audit: sí.

**VerifyMfa**
- Actor: Usuario autenticado.
- Preconditions: enrollment pendiente.
- Operation: validar código TOTP; activar `mfaEnabled = true`.
- Invariants: código válido; secret coincide.
- Result: `MfaEnabled` event.
- Audit: sí.

**DisableMfa**
- Actor: Usuario autenticado o admin.
- Preconditions: MFA activo; código TOTP o password válido.
- Operation: establecer `mfaEnabled = false`; eliminar secret y backup codes.
- Invariants: si es admin, se audita con justificación.
- Result: `MfaDisabled` event.
- Audit: sí.

---

### 16.2 Document Management Commands

**CreateDocument**
- Actor: Usuario con `documents:create`.
- Preconditions: tenant activo; `code` único dentro de la organización.
- Operation: crear `Document` en estado `DRAFT` con metadatos iniciales.
- Invariants: `code` único; `ownerId` y `responsibleId` pertenecen al tenant.
- Result: `DocumentCreated` event.
- Audit: sí.
- Idempotency: soporta `Idempotency-Key`.

**SubmitDocumentForReview**
- Actor: Usuario con `documents:submit`.
- Preconditions: estado `DRAFT` o `REJECTED`; existe al menos una versión.
- Operation: transicionar a `IN_REVIEW`; asignar revisores si aplica.
- Invariants: no se puede enviar sin versiones.
- Result: `DocumentSubmittedForReview` event.
- Audit: sí.

**ApproveDocument**
- Actor: Usuario con `documents:approve` y designado como aprobador.
- Preconditions: estado `PENDING_APPROVAL`; usuario es aprobador autorizado.
- Operation: transicionar a `APPROVED`; registrar aprobación.
- Invariants: aprobación no puede alterarse después.
- Result: `DocumentApproved` event.
- Audit: sí.
- Idempotency: soporta `Idempotency-Key`.

**RejectDocument**
- Actor: Usuario con `documents:approve`.
- Preconditions: estado `PENDING_APPROVAL`; comentario obligatorio.
- Operation: transicionar a `REJECTED`; registrar rechazo.
- Invariants: rechazo debe incluir comentario.
- Result: `DocumentRejected` event.
- Audit: sí.

**PublishDocument**
- Actor: Usuario con `documents:publish`.
- Preconditions: estado `APPROVED`; versión aprobada existe; archivo disponible.
- Operation: transicionar a `PUBLISHED`; actualizar `current_version_id`; generar evento de firma si aplica.
- Invariants: no se puede publicar sin aprobación.
- Result: `DocumentPublished` event.
- Audit: sí.
- Idempotency: soporta `Idempotency-Key`.

**ObsoleteDocument**
- Actor: Usuario con `documents:obsolete`.
- Preconditions: estado `PUBLISHED` o `CURRENT`.
- Operation: transicionar a `OBSOLETE`; registrar motivo.
- Invariants: motivo obligatorio.
- Result: `DocumentObsoleted` event.
- Audit: sí.

**CancelDocument**
- Actor: Usuario con `documents:cancel`.
- Preconditions: estado `DRAFT`, `IN_REVIEW` o `PENDING_APPROVAL`.
- Operation: transicionar a `CANCELLED`; registrar motivo.
- Invariants: motivo obligatorio.
- Result: `DocumentCancelled` event.
- Audit: sí.

**CreateDocumentVersion**
- Actor: Usuario con `documents:createVersion`.
- Preconditions: documento existe; números de versión no duplicados.
- Operation: crear `DocumentVersion` asociada a un `FileAsset`.
- Invariants: `(documentId, versionMajor, versionMinor)` único; `versionMajor >= 1`, `versionMinor >= 0`.
- Result: `DocumentVersionCreated` event.
- Audit: sí.
- Idempotency: soporta `Idempotency-Key`.

**SignDocumentVersion**
- Actor: Usuario autenticado con permiso `documents:sign`.
- Preconditions: versión existe; usuario no firmó previamente.
- Operation: crear `ElectronicSignatureEvent` con hashes.
- Invariants: `signedContentHash` coincide con hash del archivo; evento inmutable.
- Result: `DocumentSigned` event.
- Audit: sí.
- Idempotency: soporta `Idempotency-Key`.

---

### 16.3 Audit Commands

**CreateAuditProgram**
- Actor: Usuario con `audits:create`.
- Preconditions: tenant activo.
- Operation: crear `AuditProgram`.
- Invariants: `periodEnd >= periodStart`.
- Result: `AuditProgramCreated` event.
- Audit: sí.

**CreateAudit**
- Actor: Usuario con `audits:create`.
- Preconditions: `code` único en tenant.
- Operation: crear `Audit` en estado `PLANNED`.
- Invariants: `code` único.
- Result: `AuditCreated` event.
- Audit: sí.

**StartAudit**
- Actor: Usuario con `audits:start`.
- Preconditions: estado `PLANNED`; `actualStart` proporcionado.
- Operation: transicionar a `IN_PROGRESS`; registrar `actualStart`.
- Invariants: no se puede iniciar sin fecha de inicio real.
- Result: `AuditStarted` event.
- Audit: sí.

**CompleteAudit**
- Actor: Usuario con `audits:complete`.
- Preconditions: estado `IN_PROGRESS`; `actualEnd` proporcionado.
- Operation: transicionar a `COMPLETED`; registrar `actualEnd`.
- Invariants: no se puede completar sin fecha de fin.
- Result: `AuditCompleted` event.
- Audit: sí.

**CancelAudit**
- Actor: Usuario con `audits:cancel`.
- Preconditions: estado `PLANNED` o `IN_PROGRESS`.
- Operation: transicionar a `CANCELLED`; registrar motivo.
- Invariants: auditoría cancelada no puede reactivarse.
- Result: `AuditCancelled` event.
- Audit: sí.

**CreateAuditFinding**
- Actor: Usuario con `audits:createFindings`.
- Preconditions: auditoría existe; tipo válido.
- Operation: crear `AuditFinding`.
- Invariants: hallazgo debe referenciar la auditoría.
- Result: `FindingCreated` event.
- Audit: sí.

---

### 16.4 Nonconformity Commands

**CreateNonconformity**
- Actor: Usuario con `nonconformities:create`.
- Preconditions: `code` único en tenant.
- Operation: crear `Nonconformity` en estado `OPEN`.
- Invariants: `code` único; `severity` válida.
- Result: `NonconformityCreated` event.
- Audit: sí.

**PerformRootCauseAnalysis**
- Actor: Usuario con `nonconformities:update`.
- Preconditions: no conformidad existe; no tiene análisis previo.
- Operation: crear `RootCauseAnalysis` con metodología y datos.
- Invariants: relación 1:1; metodología válida.
- Result: `RootCauseAnalysed` event.
- Audit: sí.

**CreateCorrectiveAction**
- Actor: Usuario con `nonconformities:createActions`.
- Preconditions: no conformidad existe; `code` único.
- Operation: crear `CorrectiveAction` en estado `OPEN`.
- Invariants: `code` único; `responsibleId` pertenece al tenant.
- Result: `CorrectiveActionCreated` event.
- Audit: sí.

**CompleteCorrectiveAction**
- Actor: Usuario con `nonconformities:updateActions`.
- Preconditions: acción en estado `OPEN` o `IN_PROGRESS`.
- Operation: transicionar a `COMPLETED`; registrar `completedAt`.
- Invariants: no se puede completar sin evidencia si `effectivenessRequired = true`.
- Result: `CorrectiveActionCompleted` event.
- Audit: sí.

**VerifyCorrectiveAction**
- Actor: Usuario con `nonconformities:verifyActions` (independiente del ejecutor).
- Preconditions: acción en estado `COMPLETED`.
- Operation: crear `CorrectiveActionVerification` con `effectivenessStatus`.
- Invariants: verificador no puede ser el mismo que el responsable de la acción.
- Result: `CorrectiveActionVerified` event.
- Audit: sí.

**CloseNonconformity**
- Actor: Usuario con `nonconformities:close`.
- Preconditions: análisis de causa raíz completado; todas las acciones verificadas como efectivas.
- Operation: transicionar a `CLOSED`; registrar `closedBy`, `closedAt`.
- Invariants: no se puede cerrar sin cumplir condiciones.
- Result: `NonconformityClosed` event.
- Audit: sí.

---

### 16.5 Risk Commands

**CreateRisk**
- Actor: Usuario con `risks:create`.
- Preconditions: `code` único en tenant.
- Operation: crear `Risk` en estado `IDENTIFIED`.
- Invariants: `code` único; `riskType` válido.
- Result: `RiskCreated` event.
- Audit: sí.

**AssessRisk**
- Actor: Usuario con `risks:assess`.
- Preconditions: riesgo existe; no tiene evaluación previa pendiente.
- Operation: crear `RiskAssessment`; calcular `score` backend.
- Invariants: `probability` e `impact` según configuración del tenant; score no editable por cliente.
- Result: `RiskAssessed` event.
- Audit: sí.

**CreateRiskTreatment**
- Actor: Usuario con `risks:createTreatments`.
- Preconditions: riesgo existe; `strategy` válida.
- Operation: crear `RiskTreatment` en estado `PLANNED`.
- Invariants: `strategy` dentro del catálogo permitido.
- Result: `RiskTreatmentPlanned` event.
- Audit: sí.

**CompleteRiskTreatment**
- Actor: Usuario con `risks:updateTreatments`.
- Preconditions: tratamiento en estado `PLANNED` o `IN_PROGRESS`.
- Operation: transicionar a `COMPLETED`; registrar `completedAt`.
- Invariants: tratamiento completado no cierra automáticamente el riesgo.
- Result: `RiskTreatmentCompleted` event.
- Audit: sí.

**ReassessRisk**
- Actor: Usuario con `risks:assess`.
- Preconditions: tratamiento completado; existe evaluación previa.
- Operation: crear nueva `RiskAssessment`; comparar residual contra criterios de aceptación.
- Invariants: riesgo residual debe estar documentado.
- Result: `RiskReassessed` event.
- Audit: sí.

---

## 17. State Machines

### 17.1 Document

| State | Allowed transitions | Actor | Preconditions | Side effects | Audit event |
|---|---|---|---|---|---|
| `DRAFT` | `IN_REVIEW`, `CANCELLED` | Owner/Responsible | Existe al menos una versión | Asignar revisores | `DOCUMENT_SUBMITTED_FOR_REVIEW` |
| `IN_REVIEW` | `PENDING_APPROVAL`, `CANCELLED` | Sistema/Workflow | Todos los revisores completaron | Avanzar a aprobación | `DOCUMENT_SUBMITTED_FOR_APPROVAL` |
| `PENDING_APPROVAL` | `APPROVED`, `REJECTED`, `CANCELLED` | Aprobador designado | Aprobador autenticado | Registrar aprobación/rechazo | `DOCUMENT_APPROVED` / `DOCUMENT_REJECTED` |
| `APPROVED` | `PUBLISHED`, `CANCELLED` | Publicador | Versión aprobada; archivo disponible | Actualizar `current_version_id` | `DOCUMENT_PUBLISHED` |
| `PUBLISHED` | `OBSOLETE` | Owner/Responsible | Motivo obligatorio | Notificar distribución | `DOCUMENT_OBSOLETED` |
| `REJECTED` | `DRAFT` | Owner/Responsible | Correcciones aplicadas | Nueva versión opcional | `DOCUMENT_RESUBMITTED` |
| `CANCELLED` | — | — | — | No transitions | `DOCUMENT_CANCELLED` |

---

### 17.2 Audit

| State | Allowed transitions | Actor | Preconditions | Side effects | Audit event |
|---|---|---|---|---|---|
| `PLANNED` | `IN_PROGRESS`, `CANCELLED` | Lead auditor | Fechas definidas | Notificar equipo | `AUDIT_STARTED` |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED` | Lead auditor | Checklists completadas | Generar hallazgos | `AUDIT_COMPLETED` |
| `COMPLETED` | — | — | — | No transitions | `AUDIT_COMPLETED` |
| `CANCELLED` | — | — | — | No transitions | `AUDIT_CANCELLED` |

---

### 17.3 Nonconformity

| State | Allowed transitions | Actor | Preconditions | Side effects | Audit event |
|---|---|---|---|---|---|
| `OPEN` | `ANALYSIS` | Responsable NC | No conformidad registrada | Iniciar análisis | `NONCONFORMITY_ANALYSIS_STARTED` |
| `ANALYSIS` | `ACTION_PLANNED` | Responsable NC | Root cause completada | Planificar acciones | `NONCONFORMITY_ACTIONS_PLANNED` |
| `ACTION_PLANNED` | `IMPLEMENTATION` | Responsable acción | Acciones creadas | Ejecutar acciones | `CORRECTIVE_ACTION_STARTED` |
| `IMPLEMENTATION` | `VERIFICATION` | Responsable acción | Acción completada | Solicitar verificación | `CORRECTIVE_ACTION_COMPLETED` |
| `VERIFICATION` | `CLOSED` | Verificador independiente | Verificación exitosa | Cerrar NC | `NONCONFORMITY_CLOSED` |
| `CLOSED` | — | — | — | No transitions | `NONCONFORMITY_CLOSED` |

---

### 17.4 CorrectiveAction

| State | Allowed transitions | Actor | Preconditions | Side effects | Audit event |
|---|---|---|---|---|---|
| `OPEN` | `IN_PROGRESS` | Responsable | Acción aprobada | Iniciar ejecución | `CORRECTIVE_ACTION_STARTED` |
| `IN_PROGRESS` | `COMPLETED` | Responsable | Evidencia de ejecución | Solicitar verificación | `CORRECTIVE_ACTION_COMPLETED` |
| `COMPLETED` | `VERIFIED` | Verificador | Verificación realizada | Cerrar acción | `CORRECTIVE_ACTION_VERIFIED` |
| `VERIFIED` | `CLOSED` | Sistema/Responsable | Efectividad confirmada | Archivar | `CORRECTIVE_ACTION_CLOSED` |
| `VERIFIED` | `REJECTED` | Verificador | Efectividad no demostrada | Reabrir acción | `CORRECTIVE_ACTION_REJECTED` |
| `REJECTED` | `IN_PROGRESS` | Responsable | Nueva planificación | Reejecutar | `CORRECTIVE_ACTION_RESTARTED` |

---

### 17.5 Risk

| State | Allowed transitions | Actor | Preconditions | Side effects | Audit event |
|---|---|---|---|---|---|
| `IDENTIFIED` | `ASSESSED` | Responsable riesgo | Datos básicos completos | Calcular score | `RISK_ASSESSED` |
| `ASSESSED` | `TREATMENT_PLANNED` | Responsable riesgo | Score y nivel definidos | Planificar tratamiento | `RISK_TREATMENT_PLANNED` |
| `TREATMENT_PLANNED` | `UNDER_CONTROL` | Responsable tratamiento | Tratamiento ejecutado | Monitorear residual | `RISK_TREATMENT_COMPLETED` |
| `UNDER_CONTROL` | `CLOSED` | Responsable riesgo | Re-evaluación aceptable | Cerrar riesgo | `RISK_CLOSED` |
| `UNDER_CONTROL` | `ASSESSED` | Responsable riesgo | Nuevos datos | Re-evaluar | `RISK_REASSESSED` |
| `CLOSED` | — | — | — | No transitions | `RISK_CLOSED` |

---

## 18. Business Invariants

Las siguientes reglas deben cumplirse en todo momento dentro del dominio:

1. **Tenant Isolation:** ningún usuario puede acceder, modificar o eliminar recursos de otra organización.
2. **Document Uniqueness:** el `code` de un documento es único dentro de la organización mientras no esté eliminado.
3. **Document Version Immutability:** una versión publicada no puede modificarse ni eliminarse; cualquier cambio requiere nueva versión.
4. **Document Current Version:** solo una versión puede estar vigente como `current_version_id`.
5. **Document Approval Requirement:** no se puede publicar sin aprobación previa.
6. **Document State Transitions:** los cambios de estado siguen la máquina de estados definida; no se permiten saltos arbitrarios.
7. **Nonconformity Closure:** una no conformidad no puede cerrarse sin análisis de causa raíz y acciones correctivas verificadas.
8. **Corrective Action Verification:** una verificación no puede crearse si la acción no está completada; el verificador no puede ser el responsable de la acción.
9. **Risk Score Backend:** el score de riesgo se calcula exclusivamente en backend; el cliente no lo determina.
10. **Risk Treatment Residual:** un tratamiento completado no cierra automáticamente el riesgo; debe reevaluarse el residual.
11. **User Email Uniqueness:** el email es único dentro de la organización entre usuarios activos.
12. **User Self-Privilege Escalation:** un usuario no puede asignarse roles a sí mismo ni elevar sus propios permisos.
13. **Audit Log Immutability:** los registros de auditoría no se actualizan ni eliminan desde la aplicación.
14. **Electronic Signature Integrity:** el hash firmado debe coincidir con el contenido en el momento de la firma.
15. **File Asset Integrity:** el `sha256Hash` permite detectar alteraciones; el objeto en storage no se modifica.
16. **Training Participant Uniqueness:** un usuario no puede registrarse dos veces en la misma sesión.
17. **Notification Preference Uniqueness:** `(userId, notificationType)` es único.
18. **Standard Requirement Hierarchy:** no pueden existir ciclos en la jerarquía de requisitos.
19. **Process Hierarchy:** no pueden existir ciclos en la jerarquía de procesos.
20. **Optimistic Locking:** operaciones concurrentes sobre el mismo agregado deben detectarse y rechazarse.

---

## 19. Domain Errors

Errores de negocio puros, independientes de HTTP.

| Error code | Mensaje conceptual | Condición |
|---|---|---|
| `TENANT_ISOLATION_VIOLATION` | Acceso a recursos de otro tenant | organizationId no coincide con contexto |
| `DOCUMENT_INVALID_STATE` | Estado de documento inválido para la operación | Transición no permitida |
| `DOCUMENT_APPROVAL_REQUIRED` | Documento requiere aprobación previa | Intento de publicar sin aprobar |
| `DOCUMENT_VERSION_IMMUTABLE` | Versión publicada es inmutable | Intento de modificar versión publicada |
| `DOCUMENT_DUPLICATE_CODE` | Código de documento duplicado | `code` ya existe en tenant |
| `DOCUMENT_VERSION_DUPLICATE` | Número de versión duplicado | `(documentId, versionMajor, versionMinor)` existe |
| `NONCONFORMITY_ALREADY_CLOSED` | No conformidad ya cerrada | Intento de cerrar NC cerrada |
| `NONCONFORMITY_CLOSURE_FORBIDDEN` | Cierre no permitido | Falta root cause o verificaciones pendientes |
| `ROOT_CAUSE_ALREADY_EXISTS` | Análisis de causa raíz duplicado | Relación 1:1 ya existe |
| `CORRECTIVE_ACTION_NOT_READY` | Acción no lista para verificación | Estado no es `COMPLETED` |
| `CORRECTIVE_ACTION_VERIFICATION_FORBIDDEN` | Verificación no permitida | Verificador igual a responsable |
| `RISK_ASSESSMENT_REQUIRED` | Evaluación de riesgo requerida | Intento de tratamiento sin assessment |
| `RISK_TREATMENT_RESIDUAL_NOT_ACCEPTABLE` | Riesgo residual no aceptable | Supera criterios organizacionales |
| `USER_EMAIL_DUPLICATE` | Email duplicado en tenant | Unique constraint |
| `USER_SELF_PRIVILEGE_ESCALATION` | Auto-asignación de roles prohibida | `assignedBy == userId` |
| `USER_LOCKED` | Usuario bloqueado | `isLocked = true` o `lockedUntil` futuro |
| `USER_INACTIVE` | Usuario inactivo | `isActive = false` o `deletedAt` presente |
| `MFA_REQUIRED` | MFA requerido | `mfaEnabled = true` y código no enviado |
| `MFA_INVALID_CODE` | Código MFA inválido | TOTP o recovery code incorrecto |
| `REFRESH_TOKEN_REUSE` | Reutilización de refresh token | Token revocado reutilizado |
| `IDOR_VIOLATION` | Intento de acceso cruzado | Recurso no pertenece al tenant |
| `OPTIMISTIC_CONCURRENCY_CONFLICT` | Conflicto de concurrencia | `updatedAt` modificado por otro request |
| `IDEMPOTENCY_KEY_REQUIRED` | Idempotency key requerida | Operación crítica sin header |
| `IDEMPOTENCY_KEY_ALREADY_USED` | Idempotency key ya utilizada | Clave duplicada dentro de ventana |
| `AUDIT_LOG_TAMPER_DETECTED` | Manipulación de audit log detectada | Hash chain inválida |
| `ELECTRONIC_SIGNATURE_INVALID_HASH` | Hash de firma no coincide | Contenido alterado post-firma |
| `FILE_ASSET_NOT_FOUND` | Archivo no encontrado en storage | Object key inexistente |
| `FILE_ASSET_HASH_MISMATCH` | Hash de archivo no coincide | `sha256Hash` no coincide con storage |
| `TRAINING_PARTICIPANT_DUPLICATE` | Participante duplicado en sesión | `(sessionId, userId)` existe |
| `INDICATOR_MEASUREMENT_INVALID` | Medición inválida | Indicador inactivo o datos incorrectos |
| `NOTIFICATION_PREFERENCE_DUPLICATE` | Preferencia duplicada | `(userId, notificationType)` existe |

---

## 20. Transaction Boundaries

Las operaciones de dominio deben ejecutarse dentro de límites transaccionales claros.

### 20.1 Regla general

Cada comando de dominio opera sobre un único aggregate root y sus entidades internas. Si el comando afecta a múltiples agregados, se coordina mediante:

- Saga orquestada (para flujos largos).
- Eventos de dominio (para propagación eventual).
- Transacción distribuida solo cuando sea estrictamente necesario (evitar).

### 20.2 Límites transaccionales por comando

| Comando | Aggregate root | Entidades afectadas | Transacción |
|---|---|---|---|
| `CreateDocument` | Document | Document | Una transacción |
| `SubmitDocumentForReview` | Document | Document | Una transacción |
| `ApproveDocument` | Document | Document + DocumentApproval | Una transacción |
| `PublishDocument` | Document | Document + DocumentVersion | Una transacción |
| `CreateDocumentVersion` | Document | DocumentVersion | Una transacción |
| `SignDocumentVersion` | Document | ElectronicSignatureEvent | Una transacción |
| `CreateAudit` | Audit | Audit + AuditChecklist (opcional) | Una transacción |
| `CreateAuditFinding` | Audit | AuditFinding | Una transacción |
| `CreateNonconformity` | Nonconformity | Nonconformity | Una transacción |
| `PerformRootCauseAnalysis` | Nonconformity | RootCauseAnalysis | Una transacción |
| `CreateCorrectiveAction` | Nonconformity | CorrectiveAction | Una transacción |
| `CompleteCorrectiveAction` | CorrectiveAction | CorrectiveAction | Una transacción |
| `VerifyCorrectiveAction` | CorrectiveAction | CorrectiveActionVerification | Una transacción |
| `CloseNonconformity` | Nonconformity | Nonconformity | Una transacción (valida dependencias) |
| `CreateRisk` | Risk | Risk | Una transacción |
| `AssessRisk` | Risk | RiskAssessment | Una transacción |
| `CreateRiskTreatment` | Risk | RiskTreatment | Una transacción |
| `CompleteRiskTreatment` | Risk | RiskTreatment | Una transacción |
| `ReassessRisk` | Risk | RiskAssessment | Una transacción |

### 20.3 Eventual consistency

Eventos que requieren coordinación entre agregados diferentes:

- `DocumentPublished` → notificar a `TrainingCourse` si está vinculado.
- `NonconformityClosed` → notificar a `Audit` si deriva de auditoría.
- `CorrectiveActionVerified` → evaluar cierre de `Nonconformity`.
- `RiskTreatmentCompleted` → disparar `ReassessRisk`.

Estos flujos utilizan eventos de dominio y no transacciones distribuidas.

---

## 21. Idempotency

Los siguientes comandos soportan idempotencia mediante `Idempotency-Key`:

| Comando | Motivo |
|---|---|
| `CreateDocument` | Evita duplicados ante reintentos |
| `CreateDocumentVersion` | Evita versiones duplicadas |
| `ApproveDocument` | Evita aprobaciones dobles |
| `PublishDocument` | Evita publicaciones duplicadas |
| `SignDocumentVersion` | Evita firmas duplicadas |
| `CreateAuditFinding` | Evita hallazgos duplicados |
| `CreateCorrectiveAction` | Evita acciones duplicadas |
| `VerifyCorrectiveAction` | Evita verificaciones duplicadas |

Implementación:
- Backend almacena `(idempotencyKey, result, ttl)`.
- TTL: 24 horas para operaciones críticas; 1 hora para operaciones de lectura.
- Si la clave ya existe, se retorna el resultado almacenado.

---

## 22. Concurrency

### 22.1 Optimistic Locking

Se aplica sobre el campo `updatedAt` de los agregados mutables.

**Mecanismo:**
- Cliente envía `If-Match: "2024-01-01T00:00:00.000Z"` con el valor conocido.
- Backend compara con `updatedAt` actual.
- Si coincide: aplica cambio y retorna nuevo `updatedAt`.
- Si difiere: retorna `409 ConcurrentUpdate` con valores esperado y actual.

**Agregados sujetos:**
- Document
- DocumentVersion
- DocumentApproval
- Nonconformity
- CorrectiveAction
- Risk

### 22.2 Comportamiento ante conflicto

1. Backend retorna `409 ConcurrentUpdate`.
2. Cliente relee el recurso.
3. Cliente reaplica cambios con el nuevo `updatedAt`.
4. Si el conflicto persiste, se notifica al usuario.

### 22.3 Excepciones

- Entidades inmutables (`DocumentVersion` publicada, `AuditLog`, `ElectronicSignatureEvent`) no requieren optimistic locking.
- Operaciones de solo lectura no requieren locking.

---

## 23. Auditability

Toda operación crítica debe generar trazabilidad.

### 23.1 Registro obligatorio

Cada comando que cambie estado debe registrar:

- `actor`: usuario que ejecutó la acción.
- `tenant`: `organizationId`.
- `timestamp`: momento exacto.
- `action`: código del evento.
- `entity`: tipo y ID del recurso afectado.
- `previousState`: valores anteriores (cuando aplique).
- `newState`: valores nuevos.
- `correlationId`: ID de correlación de la request.
- `result`: `SUCCESS` o `FAILURE`.

### 23.2 Eventos auditados

Ver sección 15.1 (Catálogo de Eventos) y SECURITY.md §17.

### 23.3 Cadena de hash

- Cada `AuditLog` incluye `previousHash` y `eventHash`.
- `event_hash = SHA-256(canonical_payload + previous_hash)`.
- El primer evento de una organización usa `previous_hash = genesis`.
- La validación periódica detecta alteraciones.

---

## 24. Domain Services

Operaciones que no pertenecen naturalmente a una sola entidad.

### 24.1 DocumentPublicationService

**Responsabilidad:** coordinar la publicación de un documento.

**Operaciones:**
- Validar que la versión esté aprobada.
- Verificar que el archivo exista en storage.
- Actualizar `current_version_id`.
- Generar distribuciones automáticas si aplica.
- Registrar firma electrónica de publicación.
- Emitir `DocumentPublished` event.

### 24.2 RiskAssessmentService

**Responsabilidad:** calcular el score de riesgo según configuración dinámica.

**Operaciones:**
- Obtener matriz de probabilidad/impacto desde `organization_settings`.
- Aplicar fórmula configurada.
- Almacenar `calculationData` para auditoría.
- Validar que el score resultante sea coherente.

### 24.3 CorrectiveActionVerificationService

**Responsabilidad:** coordinar la verificación de efectividad.

**Operaciones:**
- Validar que la acción esté completada.
- Validar que el verificador no sea el responsable.
- Registrar verificación con evidencia.
- Determinar si la no conformidad puede cerrarse.
- Emitir eventos correspondientes.

### 24.4 AuditLogChainService

**Responsabilidad:** mantener la cadena de hash del audit log.

**Operaciones:**
- Calcular `event_hash` canónico.
- Insertar registro append-only.
- Validar periodicamente la cadena.
- Generar alertas si se detecta manipulación.

---

## 25. Repository Boundaries

Los repositorios deben corresponder a aggregate roots, no a tablas individuales.

| Aggregate Root | Repository | Responsabilidad |
|---|---|---|
| `Organization` | `OrganizationRepository` | CRUD + settings + estándares adoptados |
| `User` | `UserRepository` | CRUD + roles + MFA + sesiones |
| `Document` | `DocumentRepository` | CRUD + versiones + distribuciones + acuses |
| `Audit` | `AuditRepository` | CRUD + checklists + hallazgos |
| `Nonconformity` | `NonconformityRepository` | CRUD + root cause + acciones correctivas |
| `Risk` | `RiskRepository` | CRUD + assessments + treatments |
| `TrainingCourse` | `TrainingRepository` | CRUD + sesiones + participantes |
| `Indicator` | `IndicatorRepository` | CRUD + mediciones |
| `Notification` | `NotificationRepository` | Lectura + marcado de lectura |

**Reglas:**
- No exponer queries que crucen boundaries de agregados sin intención explícita.
- Los repositorios devuelven agregados completos o referencias, nunca entidades sueltas sin contexto.
- Las consultas de solo lectura (reportes) pueden usar vistas o queries específicas sin violar boundaries.

---

## 26. Value Objects

Objetos inmutables que representan conceptos del dominio sin identidad propia.

| Value Object | Propósito | Uso |
|---|---|---|
| `Email` | Validar y normalizar emails | User.email |
| `DocumentVersionNumber` | Representar `versionMajor.versionMinor` | DocumentVersion |
| `RiskScore` | Encapsular cálculo de score | RiskAssessment |
| `CorrelationId` | Identificar request traces | AuditLog, eventos |
| `ObjectKey` | Generar claves de storage únicas | FileAsset |
| `Sha256Hash` | Representar hash de archivo | FileAsset, ElectronicSignatureEvent |

**Reglas:**
- Son inmutables.
- Se comparan por valor, no por identidad.
- No tienen ID propio.
- Se validan en creación.

---

## 27. Definition of Done

DOMAIN.md se considera completo cuando se cumplen todos los siguientes criterios:

- [x] Bounded contexts definidos.
- [x] Aggregates definidos.
- [x] Aggregate roots definidos.
- [x] Entidades documentadas.
- [x] Invariantes documentadas.
- [x] State machines definidas.
- [x] Commands definidos.
- [x] Domain events definidos.
- [x] Domain errors definidos.
- [x] Transaction boundaries definidas.
- [x] Concurrency definida.
- [x] Idempotency definida.
- [x] Auditability definida.
- [x] Domain services identificados.
- [x] Repository boundaries identificados.
- [x] No existe dependencia de HTTP.
- [x] No contradice DATABASE.md.
- [x] No contradice SECURITY.md.
- [x] No contradice API_SPEC.md.

---

DOMAIN.md generado. Listo para revisión.

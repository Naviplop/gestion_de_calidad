# OBSERVABILITY.md — Observabilidad del QMS

## 1. Observability Conflicts

### CONFLICT-001: Definición de Observabilidad

| Campo | Valor |
|---|---|
| **Fuente 1** | `DEVOPS.md` §39 — define observabilidad como pilares: Logs + Metrics + Traces, con documento detallado reservado para `OBSERVABILITY.md`. |
| **Fuente 2** | `TESTING.md` §63 — define observability testing como validación de logs, metrics, traces y correlation IDs. |
| **Conflicto** | No existe contradicción. Ambas fuentes son complementarias. |
| **Impacto** | N/A. |

No se detectaron otros conflictos entre `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API_SPEC.md`, `DOMAIN.md`, `AUTH_SPEC.md`, `WORKFLOW_SPEC.md`, `DOCUMENT_MANAGEMENT.md`, `AUDIT_SYSTEM.md`, `FRONTEND.md`, `TESTING.md`, `DEVOPS.md` y `prisma/schema.prisma` que impidan definir la estrategia de observabilidad en esta fase.

---

## 2. Observability Principles

### 2.1 Principios

- **Visibility**: poder ver el estado del sistema sin acceso directo a datos sensibles.
- **Traceability**: seguir una operación end-to-end a través de servicios.
- **Security**: no exponer secretos, tokens, passwords en logs o métricas.
- **Privacy**: minimizar datos personales en telemetría; aplicar masking/redaction.
- **Correlation**: relacionar logs, metrics y traces mediante IDs estables.
- **Reliability**: la observabilidad no debe degradar el sistema.
- **Actionable alerts**: cada alerta debe requerir una acción humana.
- **Low operational noise**: evitar alertas redundantes o sin contexto.

### 2.2 Regla

La observabilidad debe permitir diagnosticar problemas sin acceder directamente a datos sensibles innecesariamente.

---

## 3. Three Pillars

### 3.1 Definición

| Pilar | Propósito | Cuándo Usar |
|---|---|---|
| **Logs** | Registro estructurado de eventos. | Diagnosticar errores, auditoría, security events. |
| **Metrics** | Medidas numéricas agregadas. | Monitoreo continuo, tendencias, alertas. |
| **Traces** | Seguimiento de request distribuida. | Latencia, cuellos de botella, dependencias. |

### 3.2 Uso Combinado

```
Trace identifica el request lento
  → Logs muestran qué ocurrió
    → Metrics confirman si es un patrón
```

---

## 4. Four Golden Signals

### 4.1 Definición

| Signal | Pregunta | Aplicación QMS |
|---|---|---|
| **Latency** | ¿Cuánto tarda? | API response, DB queries, file processing. |
| **Traffic** | ¿Cuánta demanda? | Requests por endpoint, uploads, downloads. |
| **Errors** | ¿Cuántos fallos? | 5xx, 4xx relevantes, business errors. |
| **Saturation** | ¿Qué tan lleno está? | CPU, memory, DB connections, queue depth. |

### 4.2 Regla

Aplicar los cuatro signals a cada servicio crítico.

---

## 5. Request Correlation

### 5.1 Concepto

Toda petición debe poder correlacionarse desde origen hasta destino.

### 5.2 Flujo

```
Frontend
  → requestId
    → API
      → Service
        → Database
          → External Service
```

### 5.3 Regla

El `requestId` se genera en el borde (frontend o API gateway) y se propaga en todos los hops.

---

## 6. Correlation ID

### 6.1 Definición

| Aspecto | Descripción |
|---|---|
| **Generación** | UUID en el borde de entrada. |
| **Propagación** | Header HTTP `X-Correlation-ID`. |
| **Validación** | Formato UUID, longitud máxima 36. |
| **Logging** | Incluido en cada log relevante. |
| **Respuesta HTTP** | Retornado en header de respuesta. |

### 6.2 Regla

Si el cliente proporciona un correlation ID, validar formato y longitud. No aceptar valores arbitrariamente grandes.

---

## 7. Trace ID

### 7.1 Distributed Tracing

Si se utiliza distributed tracing:

| Campo | Descripción |
|---|---|
| **traceId** | ID de traza completa. |
| **spanId** | ID de span individual. |

### 7.2 Jerarquía

```
Trace
  ├── API span
  ├── Service span
  ├── DB span
  └── External service span
```

---

## 8. Logging

### 8.1 Estrategia

Logs estructurados, preferentemente JSON cuando sea apropiado para ingestion y análisis.

---

## 9. Log Levels

### 9.1 Niveles

| Nivel | Uso |
|---|---|
| **TRACE** | Debugging detallado, desarrollo. |
| **DEBUG** | Información adicional para desarrollo. |
| **INFO** | Eventos normales del sistema. |
| **WARN** | Condiciones anómalas pero no críticas. |
| **ERROR** | Fallos que afectan funcionalidad. |
| **FATAL** | Fallos que impiden continuar. |

---

## 10. Production Logging

### 10.1 Reglas

- Evitar DEBUG permanente en producción.
- Evitar logs excesivos de trazas normales.
- Evitar información sensible: passwords, tokens, secrets.
- Rotación y retención según política.

---

## 11. Log Schema

### 11.1 Campos Estándar

| Campo | Tipo | Requerido |
|---|---|---|
| **timestamp** | ISO 8601 UTC | Sí |
| **level** | Enum | Sí |
| **service** | String | Sí |
| **environment** | Enum | Sí |
| **version** | String | Sí |
| **requestId** | UUID | Sí |
| **correlationId** | UUID | Sí |
| **traceId** | UUID | No |
| **userId** | UUID | No |
| **organizationId** | UUID | No |
| **action** | String | Sí |
| **resource** | String | Sí |
| **resourceId** | UUID | No |
| **duration** | Number | No |
| **statusCode** | Number | No |
| **errorCode** | String | No |
| **message** | String | Sí |

---

## 12. Tenant-Aware Logging

### 12.1 Propósito

Permitir investigar:
"¿Está afectando a una organización o al sistema completo?"

### 12.2 Regla

Registrar `organizationId` cuando corresponda. No permitir que logs se conviertan en un mecanismo para exponer datos de otra organización.

---

## 13. User Context

### 13.1 Cuando sea seguro

- `userId`.
- `role`.
- `organizationId`.

### 13.2 Nunca registrar

- `password`.
- `tokens`.
- `MFA secrets`.
- `session secrets`.

---

## 14. HTTP Logging

### 14.1 Registrar

| Campo | Descripción |
|---|---|
| **method** | GET, POST, etc. |
| **route** | Path del endpoint. |
| **status** | Código HTTP. |
| **duration** | Milisegundos. |
| **requestId** | Correlation ID. |

### 14.2 Evitar registrar automáticamente

- Authorization header.
- Cookies.
- Request bodies sensibles.

---

## 15. Error Logging

### 15.1 Cada error importante debe incluir

| Campo | Descripción |
|---|---|
| **errorCode** | Código estable. |
| **message** | Mensaje seguro. |
| **requestId** | Correlation ID. |
| **correlationId** | Correlation ID. |
| **stack trace** | Internamente, NO al cliente. |

### 15.2 Regla

Stack traces NO se exponen al cliente. Solo se registran internamente.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Taxonomía de Errores, Frontend Telemetry y Métricas Catalógicas]

---

## 16. Error Taxonomy

### 16.1 Categorías

| Categoría | Descripción |
|---|---|
| **Validation** | Datos inválidos o faltantes. |
| **Authentication** | Credenciales inválidas, token expirado. |
| **Authorization** | Permiso denegado, recurso prohibido. |
| **Not Found** | Recurso inexistente. |
| **Conflict** | Conflicto de estado, versión o concurrencia. |
| **Business Rule** | Violación de regla de negocio. |
| **Infrastructure** | Fallo de servicio externo o interno. |
| **Database** | Error de persistencia, constraint, conexión. |
| **External Dependency** | Proveedor externo no disponible. |
| **Security** | IDOR, privilege escalation, inyección. |

---

## 17. Error Codes

### 17.1 Convención

Los errores deben utilizar códigos estables alineados con `API_SPEC.md`.

### 17.2 Ejemplos

| Código | Categoría | Descripción |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | Authentication | Credenciales incorrectas. |
| `AUTH_FORBIDDEN` | Authorization | Acceso denegado. |
| `TENANT_ACCESS_DENIED` | Authorization | Acceso a otro tenant. |
| `DOCUMENT_NOT_FOUND` | Not Found | Documento inexistente. |
| `DOCUMENT_VERSION_CONFLICT` | Conflict | Conflicto de versión. |
| `WORKFLOW_INVALID_TRANSITION` | Business Rule | Transición no permitida. |

### 17.3 Regla

No inventar códigos que contradigan `API_SPEC.md`.

---

## 18. Frontend Error Observability

### 18.1 Capturar

- Runtime errors.
- API failures.
- Unhandled promise rejection.
- Failed navigation.
- Critical UI errors.

### 18.2 Regla

No enviar información sensible innecesaria.

---

## 19. Frontend Context

### 19.1 Cuando ocurra un error

| Campo | Descripción |
|---|---|
| **route** | Ruta actual. |
| **browser** | User agent. |
| **version** | Versión del frontend. |
| **requestId** | Correlation ID. |
| **correlationId** | Correlation ID. |

---

## 20. API Metrics

### 20.1 Métricas Base

| Métrica | Descripción |
|---|---|
| **request_count** | Cantidad de requests. |
| **request_duration** | Duración del request. |
| **error_count** | Cantidad de errores. |
| **error_rate** | Porcentaje de errores. |

### 20.2 Dimensiones

- Por endpoint.
- Por método.
- Por status.
- Por service.

---

## 21. Latency Metrics

### 21.1 Percentiles

| Percentil | Uso |
|---|---|
| **p50** | Latencia típica. |
| **p90** | Latencia aceptable. |
| **p95** | Latencia degradada. |
| **p99** | Latencia crítica. |

### 21.2 Regla

No depender solamente del promedio.

---

## 22. Database Metrics

### 22.1 Monitorear

| Métrica | Descripción |
|---|---|
| **Connection pool** | Conexiones activas vs máximas. |
| **Active connections** | Conexiones en uso. |
| **Query latency** | Duración de queries. |
| **Slow queries** | Queries que exceden threshold. |
| **Errors** | Fallos de consulta. |
| **Transaction failures** | Rollbacks y errores. |
| **Locks** | Bloqueos activos. |

---

## 23. Storage Metrics

### 23.1 Monitorear

| Métrica | Descripción |
|---|---|
| **Upload failures** | Fallos de carga. |
| **Download failures** | Fallos de descarga. |
| **Storage usage** | Espacio utilizado. |
| **Latency** | Tiempo de respuesta. |
| **Integrity failures** | Hash mismatch. |

---

## 24. File Processing Metrics

### 24.1 Si existe procesamiento de archivos

| Métrica | Descripción |
|---|---|
| **Upload count** | Archivos recibidos. |
| **Processing duration** | Tiempo de procesamiento. |
| **Validation failures** | Archivos rechazados. |
| **Malware scan failures** | Escaneo fallido. |
| **Rejected files** | Archivos no aceptados. |

---

## 25. Authentication Metrics

### 25.1 Medir

| Métrica | Descripción |
|---|---|
| **Login attempts** | Intentos totales. |
| **Successful login** | Éxitos. |
| **Failed login** | Fallos. |
| **MFA failures** | Códigos incorrectos. |
| **Password recovery** | Resets solicitados. |
| **Account lockouts** | Cuentas bloqueadas. |
| **Session revocations** | Sesiones revocadas. |

---

## 26. Security Metrics

### 26.1 Medir eventos relevantes

| Métrica | Descripción |
|---|---|
| **Unauthorized attempts** | Intentos sin permiso. |
| **IDOR attempts** | Manipulación de IDs. |
| **Privilege escalation** | Elevación de privilegios. |
| **Suspicious rate limiting** | Límites alcanzados. |
| **Malformed requests** | Requests inválidos. |
| **Blocked uploads** | Archivos bloqueados. |

---

## 27. Tenant Metrics

### 27.1 Cuando sea apropiado

| Métrica | Descripción |
|---|---|
| **Active users** | Usuarios activos por tenant. |
| **Requests** | Requests por tenant. |
| **Errors** | Errores por tenant. |
| **Storage** | Uso de storage. |
| **Documents** | Cantidad de documentos. |
| **Audits** | Cantidad de auditorías. |

### 27.2 Regla

No convertir métricas en exposición de información sensible.

---

## 28. Business Metrics

### 28.1 Métricas QMS

| Métrica | Descripción |
|---|---|
| **Documents pending approval** | Documentos esperando aprobación. |
| **Overdue documents** | Documentos vencidos. |
| **Open nonconformities** | NCs abiertas. |
| **Overdue corrective actions** | CAPA vencidas. |
| **Pending audits** | Auditorías pendientes. |
| **Overdue audits** | Auditorías vencidas. |
| **Training completion** | Capacitaciones completadas. |
| **Risk distribution** | Riesgos por nivel. |

### 28.2 Regla

Separar technical metrics de business metrics.

---

## 29. Workflow Metrics

### 29.1 Medir

| Métrica | Descripción |
|---|---|
| **Transitions** | Cambios de estado. |
| **Failed transitions** | Transiciones fallidas. |
| **Time in state** | Tiempo en cada estado. |
| **Overdue transitions** | Transiciones vencidas. |

### 29.2 Ejemplo

Document: medir tiempo desde Draft hasta Review.

---

## 30. Document Metrics

### 30.1 Medir

| Métrica | Descripción |
|---|---|
| **Documents created** | Documentos creados. |
| **Versions created** | Versiones generadas. |
| **Approvals** | Aprobaciones. |
| **Rejections** | Rechazos. |
| **Publications** | Publicaciones. |
| **Distributions** | Distribuciones. |
| **Acknowledgements** | Acuses. |
| **Downloads** | Descargas. |
| **Failures** | Fallos. |

---

## 31. Audit Metrics

### 31.1 Medir

| Métrica | Descripción |
|---|---|
| **Audits created** | Auditorías creadas. |
| **Audits started** | Auditorías iniciadas. |
| **Audits completed** | Auditorías completadas. |
| **Findings** | Hallazgos generados. |
| **Overdue findings** | Hallazgos vencidos. |
| **Closure time** | Tiempo de cierre. |

---

## 32. Nonconformity Metrics

### 32.1 Medir

| Métrica | Descripción |
|---|---|
| **Created** | Creadas. |
| **Open** | Abiertas. |
| **Overdue** | Vencidas. |
| **Resolved** | Resueltas. |
| **Closed** | Cerradas. |
| **Average closure time** | Tiempo promedio de cierre. |

---

## 33. Corrective Action Metrics

### 33.1 Medir

| Métrica | Descripción |
|---|---|
| **Assigned** | Asignadas. |
| **Completed** | Completadas. |
| **Overdue** | Vencidas. |
| **Rejected** | Rechazadas. |
| **Verified** | Verificadas. |
| **Effectiveness failures** | Inefectivas. |

---

## 34. Risk Metrics

### 34.1 Medir

| Métrica | Descripción |
|---|---|
| **High risks** | Riesgos altos. |
| **Critical risks** | Riesgos críticos. |
| **Overdue reassessments** | Reevaluaciones vencidas. |
| **Treatments** | Tratamientos. |
| **Residual risk** | Riesgo residual. |

---

## 35. Training Metrics

### 35.1 Medir

| Métrica | Descripción |
|---|---|
| **Enrollment** | Inscripciones. |
| **Attendance** | Asistencia. |
| **Completion** | Finalización. |
| **Overdue** | Vencidas. |
| **Failed completion** | Fallos. |

---

## 36. Notification Metrics

### 36.1 Medir

| Métrica | Descripción |
|---|---|
| **Created** | Creadas. |
| **Sent** | Enviadas. |
| **Failed** | Fallidas. |
| **Read** | Leídas. |
| **Retries** | Reintentos. |

---

## 37. Queue Metrics

### 37.1 Si existen queues

| Métrica | Descripción |
|---|---|
| **Queue depth** | Trabajo pendiente. |
| **Processing rate** | Procesados por tiempo. |
| **Failure rate** | Fallos. |
| **Retry count** | Reintentos. |
| **Dead-letter count** | Mensajes fallidos. |
| **Processing latency** | Tiempo de procesamiento. |

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Tracing, Health Checks, Dashboards y Alerting]

---

## 38. Trace Sampling

### 38.1 Estrategia

| Tipo de Tráfico | Muestreo |
|---|---|
| **Normal** | Porcentaje configurado. |
| **Errores** | 100% de retención. |
| **Slow requests** | 100% de retención. |
| **Security events** | 100% de retención. |

### 38.2 Regla

No asumir 100% de muestreo si el volumen futuro lo hace inviable.

---

## 39. Slow Requests

### 39.1 Definición

Definir threshold conceptual:

- `SLOW_REQUEST`: request que excede duración esperada.

### 39.2 Regla

No inventar milisegundos si no están definidos. Usar `TBD` cuando sea necesario.

---

## 40. Slow Database Queries

### 40.1 Mecanismo

Detectar queries que excedan duración esperada.

### 40.2 Regla

No registrar automáticamente datos sensibles de parámetros.

---

## 41. Health Checks

### 41.1 Endpoints

| Endpoint | Propósito |
|---|---|
| **/health** | Estado operacional general. |
| **/readiness** | Dependencies listas (DB, cache, storage). |
| **/liveness** | Proceso vivo. |

### 41.2 Regla

Definir según `DEVOPS.md`. No confundir conceptos.

---

## 42. Health Semantics

### 42.1 Liveness

El proceso puede seguir ejecutándose.

### 42.2 Readiness

El servicio puede recibir tráfico.

### 42.3 Health

Estado operacional general.

### 42.4 Regla

No confundir `alive` con `ready`.

---

## 43. Dependency Health

### 43.1 Evaluar

- Database.
- Storage.
- External APIs.
- Queues.

### 43.2 Regla

Un servicio puede estar `alive` pero `not ready` si una dependencia crítica falla.

---

## 44. Dashboards

### 44.1 Dashboards Mínimos

| # | Dashboard | Propósito |
|---|---|---|
| 1 | **System Overview** | Vista general de salud. |
| 2 | **API** | Requests, errores, latencia. |
| 3 | **Database** | Conexiones, queries, locks. |
| 4 | **Security** | Intentos de acceso, eventos. |
| 5 | **Documents** | Estado documental. |
| 6 | **Audits** | Estado de auditorías. |
| 7 | **Nonconformities** | Estado de NCs. |
| 8 | **Risks** | Distribución de riesgos. |
| 9 | **Training** | Capacitaciones. |
| 10 | **Infrastructure** | CPU, memoria, disco, red. |

---

## 45. System Overview

### 45.1 Mostrar

- Availability.
- Error rate.
- Latency.
- Traffic.
- Saturation.
- Active incidents.

---

## 46. API Dashboard

### 46.1 Mostrar

- Requests.
- Errors.
- p95.
- p99.
- Top endpoints.
- Slow endpoints.

---

## 47. Database Dashboard

### 47.1 Mostrar

- Connections.
- Latency.
- Slow queries.
- Locks.
- Errors.
- Resource utilization.

---

## 48. Security Dashboard

### 48.1 Mostrar

- Authentication failures.
- Authorization failures.
- Suspicious activity.
- Rate limiting.
- Security events.

---

## 49. Business Dashboard

### 49.1 Mostrar

Indicadores QMS. No sustituye dashboards funcionales del producto.

---

## 50. Alerting

### 50.1 Principios

Una alerta debe ser:
- Actionable.
- Meaningful.
- Deduplicated.
- Prioritized.

### 50.2 Regla

No crear alertas que no requieran acción humana.

---

## 51. Alert Severity

### 51.1 Niveles

| Severity | Descripción |
|---|---|
| **CRITICAL** | Servicio caído, datos en riesgo. |
| **HIGH** | Degradación severa. |
| **MEDIUM** | Degradación parcial. |
| **LOW** | Informativo, tendencia. |

---

## 52. Critical Alerts

### 52.1 Ejemplos

- Complete service outage.
- Database unavailable.
- Severe tenant isolation failure.
- Data integrity failure.
- Backup failure crítico.
- Security incident crítico.

---

## 53. High Alerts

### 53.1 Ejemplos

- Sustained high error rate.
- Severe latency.
- Storage unavailable.
- Repeated deployment failure.

---

## 54. Alert Routing

### 54.1 Flujo

```
Alert
  → Owner
    → Channel
      → Incident
```

### 54.2 Regla

No enviar todas las alertas a todos los usuarios.

---

## 55. Alert Deduplication

### 55.1 Objetivo

Evitar 1000 alerts por 1 root cause.

### 55.2 Regla

Debe existir deduplicación por causa raíz.

---

## 56. Alert Suppression

### 56.1 Durante maintenance planificado

- Suprimir alertas conocidas.
- Registrar maintenance window.

---

## 57. Alert Escalation

### 57.1 Flujo

```
Initial
  → Retry
    → Escalate
      → Incident
```

### 57.2 Regla

Si no hay respuesta, escalar automáticamente.

---

## 58. SLO

### 58.1 Service Level Objectives

Definir cuando existan requisitos:

- Availability.
- Latency.
- Error rate.

### 58.2 Regla

Si no existe un valor aprobado, declarar `TBD`.

---

## 59. SLA

### 59.1 Diferenciar

| Término | Descripción |
|---|---|
| **SLA** | Acuerdo comercial. |
| **SLO** | Objetivo técnico. |
| **SLI** | Indicador medible. |

### 59.2 Regla

No asumir que un SLO es automáticamente un SLA comercial.

---

## 60. SLI

### 60.1 Indicadores

- Availability.
- Latency.
- Error rate.

---

## 61. Error Budget

### 61.1 Conceptual

Si se utiliza SLO, definir error budget.

### 61.2 Regla

No imponer valores comerciales sin aprobación.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Privacidad, Correlación Avanzada, Incidentes y Definition of Done]

---

## 62. Incident Detection

### 62.1 Fuentes

- Alert.
- Monitoring.
- User report.
- Security event.
- Automated detection.

---

## 63. Incident Correlation

### 63.1 Flujo

```
Incident
  → Alert
    → Trace
      → Logs
        → Audit
          → Root Cause
```

### 63.2 Regla

Un incidente debe poder seguirse completo desde detección hasta causa raíz.

---

## 64. Audit Trail vs Technical Logs

### 64.1 Diferenciación

| Tipo | Propósito | Ejemplo |
|---|---|---|
| **Technical logs** | Diagnóstico operativo. | Stack trace, query latency. |
| **Business audit trail** | Cumplimiento y auditoría. | Document approval, user action. |

### 64.2 Regla

Un log no reemplaza `AuditLog`. Un `AuditLog` no reemplaza technical logs.

---

## 65. Security vs Audit

### 65.1 Definir claramente

| Tipo | Propósito |
|---|---|
| **Security events** | Detectar amenazas, intrusiones. |
| **Business audit events** | Trazabilidad de operaciones. |

### 65.2 Regla

Ambos pueden correlacionarse pero tienen objetivos diferentes.

---

## 66. Data Privacy

### 66.1 Nunca registrar innecesariamente

- Passwords.
- Tokens.
- MFA secrets.
- Session cookies.
- Full medical data.
- Sensitive documents.
- Private credentials.

### 66.2 Regla

Si existen datos sensibles en logs, aplicar masking/redaction.

---

## 67. PII Redaction

### 67.1 Estrategia

| Fase | Acción |
|---|---|
| **Detection** | Identificar campos sensibles. |
| **Masking** | Reemplazar por `***`. |
| **Redaction** | Eliminar del log. |
| **Retention** | Aplicar política de retención. |

---

## 68. Log Retention

### 68.1 Definir según

- Security.
- Operations.
- Compliance.

### 68.2 Regla

Si no está aprobado, declarar `TBD`.

---

## 69. Metric Retention

### 69.1 Estrategia

| Tipo | Retención |
|---|---|
| **High resolution** | Corto plazo (días/semanas). |
| **Long-term aggregation** | Largo plazo (meses/años). |

---

## 70. Trace Retention

### 70.1 Regla

Los traces pueden tener retención distinta de logs. Documentar estrategia.

---

## 71. Observability Cost

### 71.1 Controlar

- Log volume.
- Metric cardinality.
- Trace volume.
- Storage.

### 71.2 Regla

Evitar cardinalidad explosiva por valores ilimitados como labels.

---

## 72. Metric Cardinality

### 72.1 CRÍTICO

No utilizar como labels de alta cardinalidad valores ilimitados.

### 72.2 Distinguir

| Tipo | Ejemplo |
|---|---|
| **Metric labels** | `status=error`, `method=POST`. |
| **Log fields** | `userId=123`, `documentId=abc`. |

### 72.3 Regla

`userId`, `documentId`, `requestId` no deben ser labels de métricas.

---

## 73. Sampling

### 73.1 Estrategia

- Normal traffic: porcentaje configurado.
- Errores: 100%.
- Security events: 100%.

---

## 74. Version Observability

### 74.1 Propósito

Correlacionar releases con errores.

### 74.2 Registrar

- Application version.
- Build number.
- Deployment timestamp.

---

## 75. Deployment Correlation

### 75.1 Ejemplo

```
Version 1.4.2
  → error rate increased
    → correlacionar con release
```

---

## 76. Database Correlation

### 76.1 Objetivo

Correlacionar API request → service → DB query.

### 76.2 Regla

No registrar datos sensibles de parámetros.

---

## 77. External Service Correlation

### 77.1 Registrar

| Campo | Descripción |
|---|---|
| **Service** | Nombre del servicio. |
| **External request** | URL o endpoint. |
| **Response** | Status code. |
| **Duration** | Milisegundos. |
| **Error** | Si aplica. |

### 77.2 Regla

Nunca registrar secretos de autenticación.

---

## 78. Retries Observability

### 78.1 Registrar

- Retry count.
- Final result.
- Dependency.
- Duration.

### 78.2 Regla

Evitar multiplicar alertas por cada retry.

---

## 79. Timeout Observability

### 79.1 Registrar

- Timeout.
- Dependency.
- Duration.
- RequestId.

---

## 80. Cache Observability

### 80.1 Si existe cache

| Métrica | Descripción |
|---|---|
| **Hit** | Aciertos. |
| **Miss** | Fallos. |
| **Eviction** | Eliminaciones. |
| **Errors** | Fallos de cache. |
| **Latency** | Tiempo de respuesta. |

### 80.2 Regla

No crear cache solamente para tener métricas.

---

## 81. Background Job Observability

### 81.1 Registrar

- Job ID.
- Type.
- Start time.
- Duration.
- Result.
- Retries.
- Error.

---

## 82. Scheduled Job Observability

### 82.1 Registrar

- Expected execution.
- Actual execution.
- Duration.
- Result.
- Failure.

### 82.2 Regla

Permitir detectar `job did not run`.

---

## 83. File Storage Observability

### 83.1 Registrar

- Upload.
- Download.
- Delete.
- Failure.
- Latency.
- Integrity check.

### 83.2 Regla

No registrar contenido privado del archivo.

---

## 84. Tenant Incident Impact

### 84.1 Clasificación

| Impacto | Descripción |
|---|---|
| **Global** | Todo el sistema. |
| **Single Tenant** | Una organización. |
| **Multiple Tenants** | Varias organizaciones. |

### 84.2 Regla

Es especialmente importante para arquitectura SaaS futura.

---

## 85. Tenant Isolation Alerting

### 85.1 Regla

Intentos de acceso cross-tenant deben generar señales de seguridad según `SECURITY.md`.

---

## 86. Availability

### 86.1 Cálculo

Availability = Uptime / (Uptime + Downtime).

### 86.2 Regla

No considerar `planned maintenance` si la política definida lo excluye.

---

## 87. Error Rate

### 87.1 Definir

Qué respuestas cuentan como error técnico.

### 87.2 Regla

No asumir que todo `4xx` es error del sistema. Distinguir client errors de server errors.

---

## 88. Latency

### 88.1 Medir

Request duration, no solamente database duration.

---

## 89. Saturation

### 89.1 Medir

- CPU.
- Memory.
- DB connections.
- Disk.
- Queue.
- Storage.

---

## 90. Definition of Done

### 90.1 Checklist

- [x] Principios definidos.
- [x] Logs definidos.
- [x] Metrics definidos.
- [x] Traces definidos.
- [x] Correlation definido.
- [x] Request IDs definidos.
- [x] Trace IDs definidos.
- [x] Log schema definido.
- [x] Error taxonomy definida.
- [x] Error codes alineados con API.
- [x] Frontend errors definidos.
- [x] API metrics definidas.
- [x] DB metrics definidas.
- [x] Storage metrics definidas.
- [x] Authentication metrics definidas.
- [x] Security metrics definidas.
- [x] Tenant metrics definidas.
- [x] Business metrics definidas.
- [x] Workflow metrics definidas.
- [x] Document metrics definidas.
- [x] Audit metrics definidas.
- [x] Nonconformity metrics definidas.
- [x] Corrective action metrics definidas.
- [x] Risk metrics definidas.
- [x] Training metrics definidas.
- [x] Notification metrics definidas.
- [x] Queue metrics definidas si aplica.
- [x] Health checks definidos.
- [x] Dependency health definido.
- [x] Dashboards definidos.
- [x] Alerts definidos.
- [x] Alert severity definida.
- [x] Alert routing definido.
- [x] Alert deduplication definida.
- [x] Alert escalation definida.
- [x] SLI definido.
- [x] SLO definido o TBD.
- [x] SLA diferenciado de SLO.
- [x] Error budget definido si aplica.
- [x] Incident detection definido.
- [x] Incident correlation definido.
- [x] Audit correlation definido.
- [x] Security observability definido.
- [x] Privacy definido.
- [x] PII redaction definido.
- [x] Retention definido o TBD.
- [x] Metric cardinality definida.
- [x] Trace sampling definido.
- [x] Deployment correlation definido.
- [x] Database correlation definido.
- [x] External dependency correlation definido.
- [x] Retry observability definido.
- [x] Timeout observability definido.
- [x] Background jobs definido.
- [x] Scheduled jobs definido.
- [x] Storage observability definido.
- [x] Tenant impact definido.
- [x] Availability definido.
- [x] Error rate definido.
- [x] Latency definido.
- [x] Saturation definido.
- [x] No contradice ARCHITECTURE.md.
- [x] No contradice SECURITY.md.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice TESTING.md.
- [x] No contradice DEVOPS.md.
- [x] No contradice AUDIT_SYSTEM.md.

OBSERVABILITY.md generado. Listo para revisión.
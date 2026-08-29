# DEVOPS.md — Infraestructura, CI/CD y Operaciones del QMS

## 1. DevOps Conflicts

### CONFLICT-001: Estrategia de Deployment

| Campo | Valor |
|---|---|
| **Fuente 1** | `ARCHITECTURE.md` §14.1 — recomienda despliegue en contenedores Docker con orquestación. |
| **Fuente 2** | `TESTING.md` §42 — define Playwright para E2E, compatible con contenedores. |
| **Conflicto** | No existe contradicción. Ambas fuentes apoyan contenedores. |
| **Impacto** | N/A. |

No se detectaron otros conflictos entre `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `API_SPEC.md`, `DOMAIN.md`, `AUTH_SPEC.md`, `WORKFLOW_SPEC.md`, `DOCUMENT_MANAGEMENT.md`, `AUDIT_SYSTEM.md`, `FRONTEND.md`, `TESTING.md` y `prisma/schema.prisma` que impidan definir la estrategia DevOps en esta fase.

---

## 2. DevOps Principles

### 2.1 Principios

- **Reproducibility**: entornos y builds reproducibles desde código.
- **Automation**: pipeline automatizado desde commit hasta producción.
- **Immutable artifacts**: imágenes y builds inmutables; no se modifican después de creadas.
- **Infrastructure consistency**: misma configuración en todos los ambientes.
- **Security**: least privilege, secret management, scanning.
- **Observability**: logs, metrics, traces correlacionados.
- **Rollback**: capacidad de revertir cambios rápido y seguro.
- **Least privilege**: acceso mínimo necesario por servicio y usuario.
- **Disaster recovery**: backups verificados y procedimientos de recuperación.
- **Auditability**: todas las operaciones de infraestructura y despliegue son auditables.

---

## 3. Environment Topology

### 3.1 Ambientes

| Ambiente | Propósito | Acceso |
|---|---|---|
| **LOCAL** | Desarrollo individual. | Developer. |
| **DEVELOPMENT** | Integración continua, feature branches. | Team. |
| **STAGING** | Pre-producción, validación final. | QA, Product, Ops. |
| **PRODUCTION** | Operación real. | Ops, Administrators. |

### 3.2 Aislamiento

Cada ambiente debe tener:
- Base de datos independiente.
- Storage independiente.
- Secrets independientes.
- Configuración independiente.

Nunca compartir producción con otros ambientes.

---

## 4. Environment Isolation

### 4.1 Reglas

- Production DB nunca accesible desde development.
- Production secrets nunca en development.
- Production storage nunca compartida.
- Redes separadas por ambiente cuando sea posible.

### 4.2 Verificación

Los pipelines deben validar que:
- Variables de entorno no filtran secretos.
- URLs de base de datos corresponden al ambiente correcto.
- No hay referencias hardcodeadas a producción.

---

## 5. Local Development

### 5.1 Flujo

```
git clone
  ↓
install dependencies
  ↓
configure environment
  ↓
database migration
  ↓
seed
  ↓
run
```

### 5.2 Scripts Conceptuales

| Comando | Propósito |
|---|---|
| `install` | Instalar dependencias backend y frontend. |
| `dev` | Iniciar servicios en modo desarrollo. |
| `build` | Compilar aplicación. |
| `test` | Ejecutar tests. |
| `lint` | Linter. |
| `typecheck` | Verificación de tipos. |
| `format` | Formateo de código. |
| `migration` | Ejecutar migraciones de base de datos. |
| `seed` | Poblar base de datos con datos de prueba. |

### 5.3 Regla

No asumir configuraciones manuales que no estén documentadas. Todo debe ser reproducible desde comandos.

---

## 6. Developer Experience

### 6.1 Onboarding

Un nuevo developer debe poder:
1. Clonar el repositorio.
2. Ejecutar `install`.
3. Configurar variables de entorno locales.
4. Ejecutar `migration` y `seed`.
5. Ejecutar `dev`.
6. Acceder a la aplicación.

### 6.2 Regla

Documentar cada paso. No omitir prerequisitos.

---

## 7. Docker

### 7.1 Containers

| Container | Propósito |
|---|---|
| **backend** | API y lógica de negocio. |
| **frontend** | Aplicación web. |
| **database** | PostgreSQL. |
| **worker** | Jobs background, colas. |
| **reverse-proxy** | Enrutamiento, TLS, CORS. |

### 7.2 Regla

Si ARCHITECTURE.md contempla Docker, utilizarlo como estrategia de despliegue y consistencia.

---

## 8. Container Principles

### 8.1 Reglas

- Reproducibles: misma imagen produce mismo comportamiento.
- Minimizar privilegios: evitar root.
- No contener secrets: inyectar por variables de entorno.
- Health checks: cada container expone `/health` o equivalente.
- Logs estructurados: stdout/stderr.
- Imágenes versionadas: tags inmutables.

---

## 9. Image Strategy

### 9.1 Versionado

| Elemento | Estrategia |
|---|---|
| **Naming** | `qms-backend`, `qms-frontend`, `qms-worker`. |
| **Tags** | `1.0.0`, `1.0.1`, `1.1.0`. |
| **Immutable tags** | Nunca reutilizar tag existente. |
| **Registry** | Registry privado o público controlado. |
| **Retention** | Política de retención de imágenes. |

### 9.2 Regla

No utilizar `latest` como única referencia en producción.

---

## 10. Build Artifacts

### 10.1 Pipeline

```
Source
  → Build
    → Artifact
      → Registry
        → Deployment
```

### 10.2 Promoción

El mismo artifact probado en staging debe promoverse a producción cuando sea viable.

### 10.3 Regla

Build once, test everywhere, promote same artifact.

---

## 11. Networking Architecture

### 11.1 Diagrama Conceptual

```
Internet
  ↓
Reverse Proxy / Load Balancer
  ↓
Frontend / API
  ↓
Internal Services
  ↓
Database
```

### 11.2 Regla

La base de datos NO debe exponerse directamente a Internet.

---

## 12. Service Communication

### 12.1 Protocolos

| Tipo | Uso |
|---|---|
| **HTTP/HTTPS** | Comunicación externa y entre servicios. |
| **Internal network** | Comunicación backend-database. |
| **Service discovery** | Si aplica, nombres de servicio internos. |

### 12.2 Configuración

| Aspecto | Valor |
|---|---|
| **Timeout** | Configurado por servicio. |
| **Retry** | Con backoff exponencial. |
| **Circuit breaker** | Si aplica, para dependencias externas. |

### 12.3 Regla

No agregar microservicios innecesarios. Preferir modularidad monolítica si no hay necesidad de separación.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Base de Datos, Prisma, Secretos y CI/CD Pipelines]

---

## 13. Database Management

### 13.1 Tecnología

PostgreSQL según `DATABASE.md` y `ARCHITECTURE.md`.

### 13.2 Reglas

- Cada ambiente tiene su propia base de datos.
- No compartir base de datos entre ambientes.
- Backups automáticos y verificados.
- Acceso restringido por red y credenciales.

---

## 14. Prisma Management

### 14.1 Estrategia

Usar Prisma como ORM y herramienta de migraciones.

| Comando | Propósito |
|---|---|
| `prisma generate` | Generar cliente TypeScript. |
| `prisma migrate dev` | Desarrollo local. |
| `prisma migrate deploy` | Producción. |
| `prisma db seed` | Poblar datos de prueba. |

### 14.2 Separación

| Tipo | Uso |
|---|---|
| **Development migration** | Iteración local, `migrate dev`. |
| **Production migration** | Deploy controlado, `migrate deploy`. |

---

## 15. Migrations

### 15.1 Reglas

- Migrations versionadas en código.
- Nunca modificar migrations ya aplicadas en producción.
- Code review obligatorio para migrations.
- Testing de migrations en staging antes de producción.
- Backup antes de cambios críticos.

---

## 16. Production Migrations

### 16.1 Flujo

```
deploy
  → backup/checkpoint
    → migration
      → verification
        → application rollout
```

### 16.2 Regla

Evitar downtime cuando sea posible. Planificar ventanas de mantenimiento si son necesarias.

---

## 17. Zero-Downtime Migrations

### 17.1 Estrategia Expand/Migrate/Contract

Para cambios compatibles:

1. **Expand**: agregar nuevas columnas/tablas sin eliminar las antiguas.
2. **Migrate**: poblar nuevos datos, mantener compatibilidad dual.
3. **Contract**: eliminar columnas/tablas antiguas en release posterior.

### 17.2 Regla

No asumir que todas las migrations pueden ejecutarse sin downtime. Evaluar cada cambio individualmente.

---

## 18. Configuration

### 18.1 Separación

Code y Configuration deben estar separados.

### 18.2 Ejemplos

| Tipo | Ejemplo |
|---|---|
| **Database URL** | Variable de entorno. |
| **API URL** | Variable de entorno. |
| **Storage** | Configuración de bucket/ruta. |
| **Email** | SMTP/provider config. |
| **Feature flags** | Feature flag service o env vars. |
| **Environment** | NODE_ENV, APP_ENV. |

### 18.3 Regla

No hardcodear configuración sensible en código.

---

## 19. Secrets

### 19.1 Prohibiciones

Nunca almacenar secrets en:
- Git.
- Docker image.
- Source code.
- Frontend bundle.

### 19.2 Gestión

Usar secret manager:
- Variables de entorno en runtime.
- Secret manager para valores sensibles.
- Acceso auditado.
- Rotación periódica.

---

## 20. Frontend Secrets

### 20.1 Regla Crítica

Nunca colocar secretos privados en variables que terminen en el bundle del navegador.

### 20.2 Separación

| Tipo | Ejemplo | Dónde |
|---|---|---|
| **Public configuration** | API URL, feature flags | Bundle del navegador. |
| **Secret configuration** | API keys, DB passwords | Backend exclusivamente. |

---

## 21. Secret Rotation

### 21.1 Estrategia

| Tipo | Frecuencia | Notas |
|---|---|---|
| **Rotation** | Periódica. | Sin downtime. |
| **Revocation** | Inmediata si hay compromiso. | Invalidar tokens/keys. |
| **Emergency rotation** | Bajo incidente. | Procedimiento documentado. |
| **Audit** | Registrar todas las rotaciones. | Trazabilidad. |

---

## 22. CI Architecture

### 22.1 Pipeline

```
Checkout
  ↓
Install
  ↓
Lint
  ↓
Typecheck
  ↓
Unit
  ↓
Integration
  ↓
Security
  ↓
Build
  ↓
Artifact
```

### 22.2 Regla

Cada paso debe fallar rápido. No continuar si un paso previo falla.

---

## 23. CD Architecture

### 23.1 Pipeline

```
Artifact
  ↓
Deploy Staging
  ↓
Smoke
  ↓
E2E
  ↓
Approval/Gate
  ↓
Production
  ↓
Smoke
```

### 23.2 Regla

Producción requiere validación explícita. No deploy automático sin gates.

---

## 24. Pull Request

### 24.1 Checks Obligatorios

- Lint.
- Typecheck.
- Unit tests.
- Relevant integration tests.
- Security checks (dependencies, secrets scanning).

### 24.2 Regla

PR no se mergea sin checks verdes.

---

## 25. Main Branch

### 25.1 Al hacer merge a main

- Validated build.
- Artifact generado.
- Test report publicado.

---

## 26. Release

### 26.1 Flujo

```
version
  → build
    → test
      → artifact
        → deploy
```

### 26.2 Versionado

Usar Semantic Versioning si es compatible:
- MAJOR: breaking changes.
- MINOR: nuevas funcionalidades.
- PATCH: bug fixes.

---

## 27. Release Types

### 27.1 Tipos

| Tipo | Cuándo |
|---|---|
| **MAJOR** | Cambios incompatibles. |
| **MINOR** | Nuevas funcionalidades compatibles. |
| **PATCH** | Correcciones de bugs. |

---

## 28. Feature Flags

### 28.1 Estructura

| Elemento | Descripción |
|---|---|
| **Flag** | Nombre de la funcionalidad. |
| **Default** | Valor por defecto. |
| **Environment** | Por ambiente. |
| **Rollout** | Porcentaje o usuarios. |
| **Kill switch** | Desactivación inmediata. |

### 28.2 Regla

No usar feature flags como sustituto de branches. Usar para rollout controlado y kill switches.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Despliegue, Salud, Backups y Disaster Recovery]

---

## 29. Deployment Strategy

### 29.1 Estrategias

| Estrategia | Descripción | Cuándo Usar |
|---|---|---|
| **Rolling** | Reemplazo gradual de instancias. | Actualizaciones rutinarias. |
| **Blue/Green** | Dos entornos idénticos, switch de tráfico. | Cambios de alto riesgo. |
| **Canary** | Release gradual a subconjunto de usuarios. | Validación progresiva. |

### 29.2 Regla

Seleccionar la estrategia compatible con infraestructura. No introducir complejidad innecesaria.

---

## 30. Rollback

### 30.1 Alcance

Definir rollback para:
- Application.
- Frontend.
- Configuration.
- Database (cuando sea posible).

### 30.2 Regla Crítica

Rollback de aplicación NO significa automáticamente rollback de database.

### 30.3 Procedimiento

- Detectar fallo.
- Evaluar rollback vs forward fix.
- Ejecutar rollback controlado.
- Verificar health.
- Documentar incidente.

---

## 31. Database Rollback

### 31.1 Estrategias

| Estrategia | Descripción |
|---|---|
| **Backward-compatible migrations** | Preferida. No requiere rollback. |
| **Restore from backup** | Solo si es aceptable RPO/RTO. |
| **Forward fix** | Corrección hacia adelante. |

### 31.2 Regla

Preferir forward fix cuando rollback de schema sea peligroso.

---

## 32. Health Checks

### 32.1 Tipos

| Tipo | Propósito |
|---|---|
| **Liveness** | Proceso vivo. |
| **Readiness** | Dependencies listas (DB, cache). |
| **Application health** | Servicio puede recibir tráfico. |

### 32.2 Regla

Diferenciar `process is alive` de `application ready`.

---

## 33. Startup

### 33.1 Secuencia

1. Configuration validation.
2. Database connection.
3. Migrations (si aplica).
4. Dependencies check.
5. Readiness probe.

### 33.2 Regla

No ejecutar automáticamente operaciones peligrosas en startup.

---

## 34. Shutdown

### 34.1 Graceful Shutdown

1. Stop accepting requests.
2. Finish active requests.
3. Close DB connections.
4. Flush logs.
5. Stop workers.

### 34.2 Regla

No matar procesos abruptamente. Permitir finalización limpia.

---

## 35. Logging

### 35.1 Structured Logs

Formato JSON con campos:

| Campo | Descripción |
|---|---|
| **timestamp** | ISO 8601. |
| **level** | error, warn, info, debug. |
| **service** | Nombre del servicio. |
| **environment** | local, development, staging, production. |
| **requestId** | ID de request. |
| **correlationId** | ID de correlación end-to-end. |
| **actor** | Usuario o sistema. |
| **organization** | Tenant ID. |
| **action** | Operación ejecutada. |

### 35.2 Regla

No incluir secrets en logs.

---

## 36. Log Retention

### 36.1 Política

| Aspecto | Regla |
|---|---|
| **Retention** | Definida por compliance y operación. |
| **Rotation** | Por tamaño o tiempo. |
| **Access** | Solo personal autorizado. |
| **Archival** | Largo plazo si se requiere. |

### 36.2 Regla

Respetar `SECURITY.md` para retención y acceso.

---

## 37. Monitoring

### 37.1 Métricas

| Categoría | Métricas |
|---|---|
| **Infrastructure** | CPU, memory, disk, network. |
| **Application** | Requests, latency, errors. |
| **Database** | Connections, query latency, locks. |
| **Queue** | Depth, processing rate, failures. |
| **Storage** | Usage, uploads, downloads. |
| **Availability** | Uptime, health checks. |

### 37.2 Regla

Monitorear todo lo que pueda fallar.

---

## 38. Alerting

### 38.1 Alertas Críticas

| Alerta | Condición |
|---|---|
| **Service unavailable** | Health check falla. |
| **High error rate** | Error rate > umbral. |
| **Latency** | p95 > objetivo. |
| **DB failure** | Conexión perdida. |
| **Disk** | Espacio bajo. |
| **Memory** | Uso alto. |
| **Certificate** | Expiración próxima. |
| **Backup failure** | Backup no completado. |
| **Suspicious activity** | Acceso no autorizado. |

---

## 39. Observability

### 39.1 Pilares

- Logs estructurados.
- Metrics.
- Traces distribuidos.

### 39.2 Correlación

Una operación debe poder seguirse:
```
Frontend
→ API
→ Application
→ Database
→ Event
```

### 39.3 Regla

El documento detallado de observabilidad se definirá posteriormente en `OBSERVABILITY.md`. No duplicar innecesariamente.

---

## 40. Backups

### 40.1 Tipos

| Tipo | Descripción |
|---|---|
| **Database** | Dump o snapshot. |
| **File storage** | Objetos, documentos, evidencias. |
| **Configuration** | Secrets, feature flags, settings. |

### 40.2 Regla

Backups deben ser automáticos, verificados y accesibles solo por personal autorizado.

---

## 41. Backup Types

### 41.1 Estrategias

| Tipo | Descripción |
|---|---|
| **Full** | Copia completa. |
| **Incremental** | Cambios desde último backup. |
| **Differential** | Cambios desde último full backup. |
| **Snapshots** | Punto en el tiempo. |

### 41.2 Regla

Seleccionar estrategia compatible con infraestructura y RPO/RTO.

---

## 42. Backup Frequency

### 42.1 Parámetros

| Parámetro | Valor |
|---|---|
| **Schedule** | Definir según RPO. |
| **Retention** | Definir según compliance. |
| **Encryption** | Siempre. |
| **Offsite storage** | Si aplica. |

### 42.2 Regla

No inventar valores de RPO sin requisitos reales. Si no están definidos, documentar como TBD.

---

## 43. Restore

### 43.1 Procedimiento

```
Backup
  → Restore
    → Validation
```

### 43.2 Regla

Un backup no se considera confiable hasta probar restore exitoso.

---

## 44. Disaster Recovery

### 44.1 Objetivos

| Métrica | Estado |
|---|---|
| **RPO** | Recovery Point Objective. |
| **RTO** | Recovery Time Objective. |

### 44.2 Regla

Si todavía no están aprobados, declarar explícitamente TBD y explicar dónde se definirán.

---

## 45. Failure Scenarios

### 45.1 Escenarios

| Escenario | Impacto |
|---|---|
| **DB unavailable** | Servicio degradado o caído. |
| **Storage unavailable** | No se pueden subir/descargar archivos. |
| **Backend unavailable** | API no responde. |
| **Frontend unavailable** | UI no accesible. |
| **External provider unavailable** | Dependencia no crítica se degrada. |
| **Network failure** | Servicios aislados. |
| **Disk full** | Escritura bloqueada. |
| **Corrupted artifact** | Deploy fallido. |
| **Failed deployment** | Rollback requerido. |

---

## 46. Degraded Mode

### 46.1 Operación Degradada

Algunas funciones pueden operar degradadamente:

- Notifications unavailable.
- Reportes lentos.
- Búsqueda limitada.

### 46.2 Regla

Core QMS debe permanecer operativo. No prometer offline mode si no existe.

---

## 47. External Dependencies

### 47.1 Clasificación

| Dependencia | Tipo | Comportamiento si falla |
|---|---|---|
| **Email** | Non-critical | Cola de reintento. |
| **Storage** | Critical | Degradado, bloquear uploads. |
| **Identity provider** | Critical | Login bloqueado. |
| **Malware scanner** | Non-critical | Permitir con warning o rechazar. |

### 47.2 Regla

Separar critical de non-critical. Definir comportamiento explícito para cada fallo.

---

## 48. Retry Policy

### 48.1 Configuración

| Aspecto | Regla |
|---|---|
| **Retryable** | Errores transitorios (5xx, network). |
| **Non-retryable** | 4xx, validation errors. |
| **Exponential backoff** | Aumentar delay entre reintentos. |
| **Max attempts** | Límite configurado. |
| **Idempotency** | Solo reintentar operaciones idempotentes. |

### 48.2 Regla

No reintentar operaciones no idempotentes sin protección.

---

## 49. Timeouts

### 49.1 Regla

Cada integración debe tener timeout explícito.

### 49.2 Valores

| Integración | Timeout |
|---|---|
| **HTTP client** | 30s. |
| **Database query** | 10s. |
| **External API** | 15s. |
| **File upload** | 60s. |

### 49.3 Regla

Nunca depender de infinite timeout.

---

## 50. Rate Limiting

### 50.1 Infraestructura

Rate limiting en:
- Reverse proxy.
- API gateway.
- Application level.

### 50.2 Regla

Respetar `SECURITY.md` para límites y comportamientos.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Seguridad de Infraestructura, Operaciones y Definition of Done]

---

## 51. Security Hardening

### 51.1 Principios

- Mínimos privilegios en contenedores.
- Network isolation.
- TLS obligatorio en producción.
- Secure headers.
- Secret management centralizado.
- Dependency scanning.
- Image scanning.

---

## 52. Container Security

### 52.1 Reglas

- No ejecutar como root.
- Usar imágenes base oficiales y verificadas.
- Firmas de imágenes.
- Escaneo de vulnerabilidades antes de deploy.
- Límites de recursos (CPU, memory).

---

## 53. Dependency Scanning

### 53.1 Estrategia

| Tipo | Herramienta/Enfoque |
|---|---|
| **SCA** | Software Composition Analysis. |
| **CVE scan** | Base de datos de vulnerabilidades. |
| **Severity** | Bloquear critical/high. |
| **Policy** | Umbral configurado. |

---

## 54. Supply Chain

### 54.1 Elementos

| Elemento | Descripción |
|---|---|
| **Signed artifacts** | Verificar integridad. |
| **SBOM** | Software Bill of Materials. |
| **Dependency provenance** | Origen verificable. |
| **Trusted registry** | Solo registros autorizados. |

### 54.2 Regla

Documentar evolución. No implementar todo si no es necesario inicialmente.

---

## 55. TLS

### 55.1 Producción

- HTTPS obligatorio.
- Certificados gestionados automáticamente o por procedimiento documentado.
- Expiration monitoring.
- Renewal automático cuando sea posible.

---

## 56. CORS

### 56.1 Por Ambiente

| Ambiente | Configuración |
|---|---|
| **Development** | Orígenes locales permitidos. |
| **Staging** | Orígenes limitados. |
| **Production** | Solo dominios autorizados. |

### 56.2 Regla

Nunca `allow all origins` en producción sin justificación explícita.

---

## 57. Access Control

### 57.1 Producción DB

- Private network.
- Credenciales restringidas.
- Least privilege.
- Acceso auditado.

### 57.2 Admin Access

- SSH/VPN/Bastion según infraestructura.
- Cloud console con MFA.
- No asumir acceso público.

---

## 58. Operational Access

### 58.1 Separación de Roles

| Rol | Acceso |
|---|---|
| **Developer** | Code, debugging. |
| **Operator** | Deploy, monitoring. |
| **Administrator** | Infrastructure, access management. |

---

## 59. Incident Response

### 59.1 Flujo

```
Detect
  → Triage
    → Contain
      → Recover
        → Verify
          → Postmortem
```

---

## 60. Deployment Incident

### 60.1 Procedimiento

- Stop rollout.
- Inspect.
- Rollback/forward fix.
- Verify.
- Document.

---

## 61. Postmortem

### 61.1 Contenido

- Timeline.
- Impact.
- Root cause.
- Contributing factors.
- Remediation.
- Prevention.

### 61.2 Regla

No buscar culpables. Enfocarse en proceso y mejora.

---

## 62. Change Management

### 62.1 Registro

| Campo | Descripción |
|---|---|
| **Change** | Qué se cambió. |
| **Reason** | Por qué. |
| **Owner** | Responsable. |
| **Risk** | Evaluación de riesgo. |
| **Approval** | Aprobación requerida. |
| **Result** | Resultado del cambio. |

---

## 63. Workers / Jobs

### 63.1 Background Jobs

| Aspecto | Descripción |
|---|---|
| **Queue** | Sistema de colas. |
| **Worker** | Procesador de jobs. |
| **Retry** | Reintentos con backoff. |
| **Dead letter** | Cola de fallos. |
| **Idempotency** | Jobs idempotentes. |
| **Monitoring** | Métricas de cola. |

### 63.2 Regla

No crear infraestructura de colas si no existe necesidad real.

---

## 64. Cron / Scheduled Jobs

### 64.1 Propiedad

| Aspecto | Descripción |
|---|---|
| **Owner** | Equipo responsable. |
| **Schedule** | Frecuencia documentada. |
| **Timeout** | Límite de ejecución. |
| **Retry** | Política de reintentos. |
| **Monitoring** | Alertas por fallo. |
| **Audit** | Registro de ejecuciones. |

### 64.2 Ejemplos

- Review reminders.
- Notifications.
- Metrics aggregation.
- Cleanup.

---

## 65. Data Retention Jobs

### 65.1 Reglas

- Respetar legal hold.
- Respetar tenant.
- Registrar ejecución.
- Idempotentes.
- Poder detenerse.

---

## 66. Deployment Locks

### 66.1 Propósito

Evitar dos deployments incompatibles simultáneamente.

---

## 67. Migration Locks

### 67.1 Propósito

Evitar dos procesos ejecutando migrations simultáneamente.

---

## 68. Artifact Promotion

### 68.1 Estrategia

Build once → Test → Promote same artifact.

### 68.2 Regla

No reconstruir diferente para producción si puede evitarse.

---

## 69. Release Notes

### 69.1 Contenido

| Campo | Descripción |
|---|---|
| **Version** | Semver. |
| **Changes** | Nuevas funcionalidades. |
| **Fixes** | Correcciones. |
| **Migrations** | Cambios de schema. |
| **Breaking changes** | Cambios incompatibles. |
| **Operational notes** | Consideraciones de deploy. |
| **Rollback considerations** | Limitaciones de rollback. |

---

## 70. Deprecation

### 70.1 Lifecycle

```
Announced
  → Deprecated
    → Removed
```

### 70.2 Aplicar a

- APIs.
- Database fields.
- Features.

---

## 71. API Versioning

### 71.1 Regla

Respetar `API_SPEC.md`.

### 71.2 Estrategia

| Tipo | Enfoque |
|---|---|
| **Non-breaking** | Agregar campos, endpoints nuevos. |
| **Breaking** | Nueva versión de API, deprecar anterior. |

---

## 72. Feature Rollout

### 72.1 Fases

| Fase | Descripción |
|---|---|
| **Internal** | Equipo interno. |
| **Staging** | Validación completa. |
| **Limited** | Porcentaje de usuarios. |
| **Full** | Todos los usuarios. |

---

## 73. Scaling

### 73.1 Estrategias

| Tipo | Cuándo |
|---|---|
| **Vertical** | Aumentar recursos de instancia. |
| **Horizontal** | Agregar más instancias. |

### 73.2 Regla

Identificar componentes stateless cuando sea posible.

---

## 74. Session / State

### 74.1 Regla

Si backend escala horizontalmente, no depender de memoria local para estado crítico.

### 74.2 Opciones

- Shared session store.
- External cache.
- Token-based auth.

### 74.3 Respetar

`AUTH_SPEC.md`.

---

## 75. Production Checklist

### 75.1 Pre-Deploy

- [ ] Artifact verified.
- [ ] Tests passed.
- [ ] Security checks passed.
- [ ] Migration reviewed.
- [ ] Backup verified.
- [ ] Configuration verified.
- [ ] Secrets available.
- [ ] Health checks ready.
- [ ] Monitoring ready.
- [ ] Rollback plan ready.

---

## 76. Post-Deploy Checklist

### 76.1 Validación

- [ ] Health.
- [ ] Readiness.
- [ ] Authentication.
- [ ] Core API.
- [ ] Database.
- [ ] Storage.
- [ ] Documents.
- [ ] Audit.
- [ ] Notifications.
- [ ] Logs.
- [ ] Metrics.
- [ ] Errors.

---

## 77. Development Checklist

### 77.1 Developer debe poder

- [ ] clone.
- [ ] install.
- [ ] configure.
- [ ] migrate.
- [ ] seed.
- [ ] run.
- [ ] test.
- [ ] lint.
- [ ] build.

---

## 78. CI/CD Secrets

### 78.1 Reglas

- No aparecer en logs.
- Mínimo privilegio.
- Rotación periódica.
- Separados por ambiente.

---

## 79. Dependency Failure

### 79.1 Clasificación

| Tipo | Comportamiento |
|---|---|
| **Critical** | Degradar o fallar servicio. |
| **Non-critical** | Reintentar, encolar o continuar sin la funcionalidad. |

---

## 80. Data Migration Safety

### 80.1 Antes de migration crítica

- Backup.
- Test en staging.
- Review.
- Monitoring.
- Rollback/forward strategy.

---

## 81. Disaster Recovery Drill

### 81.1 Pruebas Periódicas

- Database restore.
- Storage restore.
- Application recovery.

### 81.2 Regla

Registrar resultados.

---

## 82. Definition of Done

### 82.1 Checklist

- [x] Environments definidos.
- [x] Local development definido.
- [x] Docker strategy definida.
- [x] Containers definidos.
- [x] Networking definido.
- [x] Database deployment definido.
- [x] Prisma migrations definido.
- [x] Configuration definido.
- [x] Secrets definido.
- [x] CI definido.
- [x] CD definido.
- [x] Release strategy definida.
- [x] Artifact strategy definida.
- [x] Deployment strategy definida.
- [x] Rollback definido.
- [x] Health checks definidos.
- [x] Logging definido.
- [x] Monitoring definido.
- [x] Backup definido.
- [x] Restore definido.
- [x] Disaster recovery definido.
- [x] RPO/RTO definidos o TBD.
- [x] Failure scenarios definidos.
- [x] Retry definido.
- [x] Timeout definido.
- [x] Rate limiting definido.
- [x] Security hardening definido.
- [x] Dependency scanning definido.
- [x] Container scanning definido.
- [x] Supply chain definido.
- [x] Infrastructure as Code definido si aplica.
- [x] Environment parity definida.
- [x] TLS definido.
- [x] CORS definido.
- [x] Production access definido.
- [x] Incident response definido.
- [x] Postmortem definido.
- [x] Change management definido.
- [x] Scaling definido.
- [x] Workers definido si aplica.
- [x] Scheduled jobs definido.
- [x] Retention jobs definido.
- [x] Migration locks definido.
- [x] Artifact promotion definido.
- [x] Release notes definido.
- [x] Deprecation definido.
- [x] Production checklist definido.
- [x] Post-deploy checklist definido.
- [x] Disaster recovery drill definido.
- [x] No contradice SECURITY.md.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice DATABASE.md.
- [x] No contradice TESTING.md.
- [x] No contradice ARCHITECTURE.md.

DEVOPS.md generado. Listo para revisión.
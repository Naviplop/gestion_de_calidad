# CLIENT DEMO SCRIPT — V1.0

## Duración estimada: 30-45 minutos

## Objetivo
Demostrar el flujo completo de la plataforma QMS/ISO Management en un escenario empresarial realista, mostrando seguridad, trazabilidad y control de ciclo de vida.

---

## BLOQUE 1 — Login & Seguridad (5 min)

### 1.1 Login
1. Abrir navegador en `https://staging.qms-platform.com`
2. Ingresar credenciales demo:
   - Email: `admin@iso-management.local`
   - Password: `ChangeMe123!`
3. Observar validación de credenciales

### 1.2 MFA
1. Si MFA está habilitado, ingresar código TOTP
2. Explicar: "El sistema requiere segundo factor para cuentas administrativas"

### 1.3 Security Settings
1. Navegar a `/security`
2. Mostrar:
   - Estado MFA
   - Cambio de password
   - Recovery codes
3. Explicar: "El usuario puede gestionar su propia seguridad sin intervención del administrador"

### Mensaje clave
> "La plataforma implementa autenticación robusta con MFA, refresh tokens HttpOnly y access tokens en memoria. No almacenamos credenciales en localStorage."

---

## BLOQUE 2 — Dashboard (3 min)

1. Mostrar dashboard principal
2. Navegar por KPIs:
   - Documentos pendientes de revisión
   - Auditorías en progreso
   - No conformidades abiertas
   - Riesgos activos
3. Explicar: "El dashboard da visibilidad ejecutiva del estado del SGC"

### Mensaje clave
> "La alta dirección puede monitorear el cumplimiento en tiempo real."

---

## BLOQUE 3 — Gestión Documental (8 min)

### 3.1 Crear documento
1. Ir a `/documents`
2. Crear nuevo documento:
   - Título: "Procedimiento de Control de Documentos v2.0"
   - Tipo: Procedimiento
   - Clasificación: Interna
   - Responsable: [seleccionar]
3. Subir archivo PDF de prueba
4. Guardar

### 3.2 Lifecycle
1. **Submit** → estado DRAFT → IN_REVIEW
2. **Submit for Approval** → estado IN_REVIEW → PENDING_APPROVAL
3. **Approve** → estado PENDING_APPROVAL → APPROVED
4. **Publish** → estado APPROVED → PUBLISHED/CURRENT

### 3.3 Distribución
1. Distribuir documento a usuarios/departamentos
2. Mostrar confirmación de distribución

### Mensaje clave
> "El sistema controla el ciclo de vida documental completo. No es posible saltarse estados ni modificar un documento aprobado sin seguir el flujo definido."

---

## BLOQUE 4 — Auditorías (6 min)

### 4.1 Programa de auditoría
1. Ir a `/audit-programs`
2. Mostrar programa existente o crear uno nuevo
3. Ver lista de auditorías asociadas

### 4.2 Auditoría
1. Abrir auditoría
2. Mostrar checklist
3. Completar items de checklist
4. Registrar finding

### 4.3 Finding → NC
1. Desde finding, generar No Conformidad
2. Explicar: "Un hallazgo de auditoría puede escalar automáticamente a NC según su severidad"

### Mensaje clave
> "Las auditorías están completamente trazadas desde el programa hasta el hallazgo."

---

## BLOQUE 5 — No Conformidad / CAPA (8 min)

### 5.1 No Conformidad
1. Ir a `/nonconformities`
2. Mostrar NC abierta
3. Ver detalles: descripción, severidad, responsable

### 5.2 Root Cause
1. Abrir análisis de causa raíz
2. Mostrar metodología (5 Why / Ishikawa)

### 5.3 Corrective Action
1. Crear acción correctiva
2. Asignar responsable y fecha

### 5.4 Verification
1. Verificar acción correctiva
2. Registrar evidencia

### 5.5 Cierre
1. Cerrar NC
2. Sistema valida que exista root cause y todas las CAPA verificadas antes de permitir cierre

### Mensaje clave
> "El flujo NC → Root Cause → CAPA → Verification → Close garantiza que toda desviación se resuelve de forma estructurada y verificable."

---

## BLOQUE 6 — Riesgos (5 min)

1. Ir a `/risks`
2. Mostrar listado de riesgos
3. Abrir riesgo:
   - Assessment (probabilidad, impacto, score)
   - Controls (preventivos/detectivos)
   - Treatments (mitigar, transferir, aceptar, evitar)
4. Cerrar riesgo

### Mensaje clave
> "La gestión de riesgos está integrada con el resto del SGC. Un riesgo puede derivar en NC, y una NC puede generar un nuevo riesgo."

---

## BLOQUE 7 — Archivos e Integridad (3 min)

1. Ir a `/documents`
2. Abrir documento publicado
3. Mostrar archivo adjunto
4. Descargar archivo
5. Verificar integridad (SHA-256)
6. Mostrar que el archivo está protegido contra path traversal y acceso cross-tenant

### Mensaje clave
> "Los archivos tienen checksum criptográfico, soft delete y aislamiento por tenant."

---

## BLOQUE 8 — Audit Trail & Security Events (3 min)

1. Ir a `/audit-logs`
2. Mostrar eventos de auditoría:
   - Login exitoso
   - Cambio de estado documental
   - Creación de NC
3. Ir a `/security-events`
4. Mostrar eventos de seguridad:
   - Permisos denegados
   - Intentos de acceso cruzado

### Mensaje clave
> "Toda acción relevante queda registrada en la audit trail. Los eventos de seguridad permiten detectar comportamientos anómalos."

---

## BLOQUE 9 — Administración (4 min)

1. **Users:** Listar usuarios, roles, estados
2. **Organization:** Configuración del tenant
3. **Departments/Processes/Standards:** Datos maestros
4. Explicar RBAC:
   - ADMIN: acceso total
   - MANAGER: gestión operativa
   - AUDITOR: lectura y creación de hallazgos
   - USER: operación básica

### Mensaje clave
> "El sistema soporta multi-tenant con roles y permisos granulares. Cada organización ve únicamente sus datos."

---

## BLOQUE 10 — Logout y Cierre (2 min)

1. Cerrar sesión
2. Verificar que el refresh token es revocado
3. Intentar acceso con token viejo → rechazado

### Mensaje final
> "La plataforma QMS/ISO Management ofrece control total del ciclo de vida documental, auditorías, no conformidades, riesgos y acciones correctivas, con seguridad empresarial y trazabilidad completa."

---

## Preguntas frecuentes preparadas

| Pregunta | Respuesta |
| -------- | -------- |
| ¿Puedo modificar un documento aprobado? | No directamente. Debe seguir el flujo: rechazar → editar → re-aprobar. |
| ¿Cómo se asegura el aislamiento entre tenants? | AuthGuard valida JWT, TenantContextGuard valida membership, AntiIdorGuard verifica ownership en cada recurso. |
| ¿Qué pasa si se pierde el MFA? | Recovery codes de un solo uso y proceso de recuperación administrado. |
| ¿Los archivos se pueden eliminar? | Soft delete. Si el archivo está asociado a una versión publicada, el sistema bloquea el borrado. |
| ¿Cómo se auditan los cambios? | Audit log con hash chain y security events para accesos denegados. |
| ¿Soporta S3? | La arquitectura soporta S3 via `storageProvider`. Actualmente usa almacenamiento local para V1.0. |
| ¿Qué pasa con las vulnerabilidades npm audit? | Documentadas como deuda técnica. No hay breaking changes aplicables sin upgrade mayor de NestJS. |

---

## Notas para el presentador

- Mantener tono profesional pero accesible
- Enfatizar la trazabilidad y el control
- No entrar en detalles técnicos de implementación salvo que lo soliciten
- Si el cliente pregunta por funcionalidades no incluidas, explicar que están en roadmap post-V1.0
- Si detectan un bug real, anotarlo como BLOCKER o RELEASE ISSUE y corregirlo antes de continuar

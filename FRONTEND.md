# FRONTEND.md — Arquitectura Frontend del QMS

## 1. Frontend Conflicts

### CONFLICT-001: Estructura de Carpetas

| Campo | Valor |
|---|---|
| **Fuente 1** | `ARCHITECTURE.md` §10.1 — propone estructura feature-based con carpetas globales `app/`, `components/`, `hooks/`, `lib/`, `types/` |
| **Fuente 2** | ARCHITECTURE.md también muestra `features/` con subcarpetas `api/`, `components/`, `hooks/`, `pages/`, `types/` |
| **Conflicto** | La estructura combina organización por features con carpetas globales, lo que puede generar ambigüedad sobre dónde colocar componentes compartidos. |
| **Impacto** | Bajo. Es una decisión de estilo arquitectónico, no funcional. |
| **Resolución recomendada** | Adoptar la estructura híbrida documentada en ARCHITECTURE.md: carpetas globales para concerns transversales (`app/`, `components/`, `hooks/`, `lib/`, `types/`) y `features/` para módulos de dominio. Los componentes específicos de dominio van dentro de su feature; los componentes genéricos van en `components/`. |

### CONFLICT-002: Manejo de Estado

| Campo | Valor |
|---|---|
| **Fuente 1** | `ARCHITECTURE.md` §4.1 — recomienda `TanStack Query + Zustand` |
| **Fuente 2** | No existe contradicción con otras fuentes. |
| **Conflicto** | Ninguno. ARCHITECTURE.md define claramente la estrategia. |
| **Impacto** | N/A. |

No se detectaron otros conflictos entre `ARCHITECTURE.md`, `SECURITY.md`, `AUTH_SPEC.md`, `API_SPEC.md`, `DOMAIN.md`, `WORKFLOW_SPEC.md`, `DOCUMENT_MANAGEMENT.md`, `AUDIT_SYSTEM.md` y `prisma/schema.prisma` que impidan definir la especificación frontend en esta fase.

---

## 2. Principles

### 2.1 Principios Frontend

El frontend debe ser:

- **Profesional**: interfaces limpias, consistentes, enterprise-grade.
- **Consistente**: patrones visuales y de interacción uniformes.
- **Accesible**: cumple WCAG 2.2 AA como objetivo mínimo.
- **Responsive**: usable en desktop, tablet y mobile.
- **Seguro**: no confía en el cliente para reglas de seguridad críticas.
- **Mantenible**: código modular, tipado, testeable.
- **Rápido**: carga eficiente, caching apropiado, sin bloques innecesarios.
- **Escalable**: soporta crecimiento de módulos sin refactorizaciones mayores.

### 2.2 Evitar

- Interfaces saturadas con información irrelevante.
- Colores arbitrarios sin semántica.
- Componentes duplicados por módulo.
- Lógica de negocio distribuida en componentes de presentación.
- Permisos hardcodeados como `if (user.role === 'ADMIN')`.
- Estados ambiguos o mutaciones directas desde UI.

---

## 3. Frontend NO es Autoridad

### 3.1 Regla Crítica

El frontend **NO** es responsable de garantizar seguridad.

Puede:
- Ocultar acciones según permisos.
- Mostrar/ocultar módulos.
- Adaptar UI al rol.
- Bloquear acciones obvias en UI.

Pero **toda operación** debe ser validada nuevamente por backend.

### 3.2 Ejemplo

Un botón "Approve" puede no mostrarse si el usuario no tiene `documents:approve`.

Pero incluso si el usuario invoca manualmente el endpoint, el backend debe rechazarlo con `403 Forbidden`.

### 3.3 Implicancia

Nunca asumir que una acción oculta equivale a una acción segura. El backend es la única fuente de verdad para autorización.

---

## 4. Stack

### 4.1 Tecnologías (según ARCHITECTURE.md)

| Componente | Tecnología | Justificación |
|---|---|---|
| **Framework** | React 18+ | Arquitectura aprobada en ARCHITECTURE.md. |
| **Lenguaje** | TypeScript | Tipado estricto end-to-end. |
| **Bundler** | Vite | Compilación rápida, HMR, optimizado para SPAs. |
| **Estilos** | Tailwind CSS | Design system desacoplado, utility-first. |
| **State Server** | TanStack Query | Caching, invalidación, estados de carga, paginación. |
| **State Local** | Zustand | Estado local de UI (modales, drawers, filtros). |
| **Routing** | React Router v6+ | Cliente-side routing con guards. |
| **Forms** | React Hook Form + Zod | Validación esquemática, performance. |
| **HTTP Client** | Axios o Fetch wrapper | Interceptores, normalización de errores. |
| **i18n** | i18next | Internacionalización ES/EN. |
| **Testing** | Vitest + Testing Library | Unit/component tests. |
| **E2E** | Playwright | Flujos críticos. |

### 4.2 Regla

No cambiar tecnología sin justificación arquitectónica documentada. ARCHITECTURE.md es la fuente de verdad del stack.

---

## 5. Application Structure

### 5.1 Estructura Híbrida (Feature-Based + Capas Globales)

```
src/
├── app/
│   ├── providers/
│   ├── router/
│   ├── App.tsx
│   └── main.tsx
├── components/
│   ├── ui/                    # Componentes primitivos reutilizables
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   ├── Toast/
│   │   └── ...
│   ├── layouts/               # Layouts compartidos
│   │   ├── Shell/
│   │   ├── Sidebar/
│   │   └── Topbar/
│   └── domain/                # Componentes de dominio reutilizables
│       ├── DocumentStatusBadge/
│       ├── ApprovalTimeline/
│       ├── AuditProgress/
│       ├── FindingSeverityBadge/
│       └── ...
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── types/
│   ├── dashboard/
│   ├── documents/
│   ├── audits/
│   ├── findings/
│   ├── nonconformities/
│   ├── corrective-actions/
│   ├── risks/
│   ├── training/
│   ├── indicators/
│   ├── users/
│   ├── roles/
│   ├── organization/
│   ├── notifications/
│   └── settings/
├── hooks/
│   ├── useAuth.ts
│   ├── useTenant.ts
│   ├── usePermissions.ts
│   └── ...
├── lib/
│   ├── api/
│   ├── auth/
│   ├── permissions/
│   ├── format/
│   └── ...
├── types/
│   ├── api.ts
│   ├── domain.ts
│   └── ...
└── styles/
    └── globals.css
```

### 5.2 Regla

Preferir organización por features cuando el módulo tiene lógica de dominio significativa. Usar carpetas globales para concerns transversales (auth, permissions, API client, formatting).

---

## 6. Feature Modules

### 6.1 Módulos Frontend

Basados en `DOMAIN.md` y `DATABASE.md`:

| Feature | Propósito | Dependencias |
|---|---|---|
| `auth` | Login, MFA, sesión, refresh. | API client, permissions. |
| `dashboard` | Panel principal con widgets por rol. | Permissions, múltiples features. |
| `documents` | Gestión documental completa. | API, uploads, workflows. |
| `audits` | Programas y ejecución de auditorías. | Checklists, findings, evidence. |
| `findings` | Hallazgos de auditoría. | Audits, nonconformities. |
| `nonconformities` | No conformidades y seguimiento. | Findings, root cause, actions. |
| `corrective-actions` | Acciones correctivas y verificación. | Nonconformities, evidence. |
| `risks` | Gestión de riesgos y tratamientos. | Assessments, treatments. |
| `training` | Cursos, sesiones, participantes. | Documents, users. |
| `indicators` | Indicadores y mediciones. | Processes, measurements. |
| `users` | Administración de usuarios. | Roles, organizations. |
| `roles` | Administración de roles y permisos. | Permissions catalog. |
| `organization` | Configuración de tenant. | Settings, standards. |
| `notifications` | Centro de notificaciones. | Eventos de dominio. |
| `settings` | Configuración global del usuario. | Preferences. |

### 6.2 Regla

Cada feature es responsable de sus propias páginas, componentes específicos, hooks y tipos. Los componentes compartidos van en `components/`.

---

## 7. Application Shell

### 7.1 Jerarquía Visual

```
┌─────────────────────────────────────────────┐
│ Topbar                                       │
│  - Logo / Brand                              │
│  - Organization Switcher                     │
│  - Global Search                             │
│  - Notifications                             │
│  - User Menu                                 │
├──────┬──────────────────────────────────────┤
│      │ Breadcrumbs                            │
│      ├──────────────────────────────────────┤
│ Side │ Page Header                            │
│ bar  ├──────────────────────────────────────┤
│      │                                        │
│      │ Content Area                           │
│      │                                        │
│      │                                        │
└──────┴──────────────────────────────────────┘
```

### 7.2 Componentes

| Componente | Responsabilidad |
|---|---|
| **Sidebar** | Navegación principal, colapsable. |
| **Topbar** | Acciones globales, usuario, tenant. |
| **Breadcrumbs** | Contexto de navegación. |
| **Page Header** | Título, acciones de página, metadatos. |
| **Content Area** | Contenido principal. |
| **Command Actions** | Acciones primarias destacadas. |
| **Notifications** | Centro de notificaciones. |
| **User Menu** | Perfil, preferencias, logout. |

### 7.3 Regla

El shell debe ser consistente en todas las páginas autenticadas. No mezclar layouts sin una razón clara.

---

## 8. Navigation

### 8.1 Estructura Principal

```
Dashboard

Quality
├── Documents
├── Audits
├── Findings
├── Nonconformities
├── Corrective Actions
├── Risks
├── Training
└── Indicators

Administration
├── Users
├── Roles
├── Organization
└── Settings
```

### 8.2 Reglas

- No mostrar módulos para los cuales el usuario no tenga acceso.
- La navegación se calcula dinámicamente según permisos efectivos.
- Los items sin acceso se ocultan, no se deshabilitan.
- El orden de los módulos es fijo para consistencia.

---

## 9. Routing

### 9.1 Tipos de Rutas

| Tipo | Descripción | Ejemplos |
|---|---|---|
| **Public** | Sin autenticación requerida. | `/login`, `/forgot-password`, `/reset-password` |
| **Authenticated** | Requiere JWT válido. | Cualquier ruta dentro del shell. |
| **Protected** | Requiere permiso específico. | `/audits`, `/nonconformities` |
| **Permission-based** | Se muestra/oculta según `can()`. | Sub-rutas de módulos. |
| **Fallback** | Ruta por defecto post-login. | `/dashboard` |
| **Unauthorized** | Acceso denegado. | `/unauthorized` |
| **Not Found** | Recurso inexistente. | `/not-found` |

### 9.2 Guards

- `PublicRoute`: redirige a `/dashboard` si ya está autenticado.
- `ProtectedRoute`: redirige a `/login` si no hay sesión.
- `PermissionRoute`: redirige a `/unauthorized` si falta permiso.

### 9.3 Regla

No confiar únicamente en route guards para seguridad. El backend valida cada request.

---

## 10. Authentication UI

### 10.1 Pantallas

| Pantalla | Propósito |
|---|---|
| **Login** | Email, password, MFA code (si aplica). |
| **Forgot Password** | Solicitud de reset. |
| **Reset Password** | Establecer nueva contraseña. |
| **MFA Enrollment** | Configuración de TOTP. |
| **MFA Verification** | Ingreso de código TOTP/recovery. |
| **Account Locked** | Informar bloqueo temporal. |
| **Unauthorized** | Acceso denegado. |

### 10.2 Flujo de Login

1. Usuario ingresa email y password.
2. Si MFA activo, mostrar campo `mfaCode`.
3. Backend valida credenciales.
4. Si éxito, almacenar access token en memoria y refresh token en HttpOnly cookie.
5. Redirigir a `/dashboard`.
6. Si fallo, mostrar error genérico (no enumerar usuario).

### 10.3 Reglas

- No mostrar "email no existe" vs "password incorrecta".
- Mensaje público: "Invalid credentials."
- No exponer información sensible en respuestas de error.
- MFA enrollment muestra QR y backup codes una sola vez.

---

## 11. Session Management

### 11.1 Comportamiento por Evento

| Evento | Comportamiento UI |
|---|---|
| **Token expires** | Intentar refresh automático. Si falla, redirigir a login. |
| **Refresh fails** | Limpiar estado, redirigir a login con mensaje. |
| **Session revoked** | Mostrar "Session revoked", redirigir a login. |
| **Account disabled** | Mostrar "Account disabled", redirigir a login. |
| **Password changed** | Cerrar sesión, redirigir a login. |

### 11.2 Regla

La aplicación debe llevar al usuario a un estado seguro ante cualquier anomalía de sesión. No mantener estado autenticado inválido.

---

## 12. Tenant Context

### 12.1 Definición

El frontend opera bajo un `Current Organization` determinada por el backend.

### 12.2 Reglas

- No permitir seleccionar arbitrariamente un `organizationId` para acceder a datos.
- El `organizationId` se obtiene del perfil del usuario (`/auth/me`) o del JWT decodificado.
- Toda pantalla opera bajo el contexto de organización actual.
- No mezclar información de diferentes organizaciones en la misma vista.

---

## 13. Multi-Tenant UX

### 13.1 Organization Switcher

Si el usuario pertenece a múltiples organizaciones:

- Mostrar selector en topbar.
- Al cambiar:
  1. Actualizar contexto de organización.
  2. Invalidar caches de TanStack Query.
  3. Recargar permisos efectivos.
  4. Limpiar datos sensibles en memoria.
  5. Redirigir a dashboard del tenant.

### 13.2 Regla

Cambiar organización no es un simple cambio de variable. Requiere re-establecer todo el contexto de sesión y datos.

---

## 14. Permissions

### 14.1 Sistema Frontend

Función centralizada:

```typescript
can(permission: string): boolean
```

Implementación:
- Cargar permisos efectivos desde `/auth/me`.
- Almacenar en Zustand store.
- Derivar capacidades UI desde este store.
- No repetir `if (user.role === 'ADMIN')` por toda la aplicación.

### 14.2 Ejemplo

```typescript
const canApprove = usePermissions.can('documents:approve');

if (canApprove) {
  <Button>Approve</Button>
}
```

### 14.3 Regla

El frontend oculta acciones según permisos, pero el backend siempre valida.

---

## 15. Resource Authorization

### 15.1 Distinción

| Concepto | Descripción |
|---|---|
| **Permission** | Capacidad genérica (`documents:approve`). |
| **Resource Access** | Autorización sobre un recurso específico (documento X). |

### 15.2 Ejemplo

`documents:approve` no implica que el usuario pueda aprobar cualquier documento.

La UI debe representar restricciones cuando el backend las conozca:
- Botón deshabilitado si no es aprobador designado.
- Mensaje: "You are not an approver for this document."

### 15.3 Regla

La UI refleja el estado del recurso, pero no es la fuente de verdad. El backend determina la autorización final.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Dashboards y Módulos de Dominio (Documentos, Auditorías, No Conformidades)]

---

## 16. Dashboard

### 16.1 Main Dashboard

Pantalla principal post-login. Muestra información relevante según el rol del usuario.

### 16.2 Widgets

| Widget | Contenido | Permiso |
|---|---|---|
| **Pending Reviews** | Documentos en `IN_REVIEW` asignados al usuario. | `documents:read` |
| **Pending Approvals** | Versiones en `PENDING_APPROVAL` donde el usuario es aprobador. | `documents:approve` |
| **Upcoming Audits** | Auditorías planificadas en los próximos 30 días. | `audits:read` |
| **Overdue Audits** | Auditorías vencidas. | `audits:read` |
| **Open Nonconformities** | No conformidades abiertas asignadas. | `nonconformities:read` |
| **Overdue Corrective Actions** | Acciones correctivas vencidas. | `corrective_actions:read` |
| **High Risks** | Riesgos con score elevado. | `risks:read` |
| **Training Pending** | Capacitaciones programadas sin completar. | `trainings:read` |
| **Indicators** | Indicadores con mediciones recientes. | `indicators:read` |
| **Notifications** | Notificaciones no leídas. | `notifications:read` |

### 16.3 Regla

No mostrar métricas que el usuario no tenga permiso de consultar. Los widgets se renderizan condicionalmente según `can()`.

---

## 17. Role-Based Dashboards

### 17.1 Roles Considerados

| Rol | Enfoque del Dashboard |
|---|---|
| **Quality Manager** | KPIs generales, auditorías pendientes, no conformidades abiertas, riesgos altos, capacitaciones. |
| **Auditor** | Auditorías asignadas, checklists pendientes, findings por cerrar. |
| **Process Owner** | Documentos de sus procesos, auditorías de su área, riesgos asociados. |
| **Document Owner** | Documentos en revisión, aprobaciones pendientes, distribuciones. |
| **Executive** | Métricas agregadas, tendencias, compliance overview. |
| **Administrator** | Usuarios, roles, configuración, auditorías del sistema. |

### 17.2 Estrategia

Preferir:
- **Common shell**: estructura base del dashboard igual para todos.
- **Role-aware widgets**: cada widget se muestra/oculta según permisos y rol.

Evitar dashboards completamente distintos si solo cambian widgets.

---

## 18. Document UI

### 18.1 Pantallas

| Pantalla | Propósito | Ruta |
|---|---|---|
| **Document List** | Listado de documentos del tenant. | `/documents` |
| **Document Detail** | Detalle, versiones, historial, acciones. | `/documents/:id` |
| **Create Document** | Formulario de creación. | `/documents/new` |
| **Edit Draft** | Edición de metadata en borrador. | `/documents/:id/edit` |
| **Version History** | Historial de versiones. | `/documents/:id/versions` |
| **Review** | Ejecución de revisión. | `/documents/:id/review` |
| **Approval** | Aprobación/rechazo. | `/documents/:id/approve` |
| **Publication** | Publicación de versión aprobada. | `/documents/:id/publish` |
| **Distribution** | Gestión de distribuciones. | `/documents/:id/distribute` |
| **Acknowledgement** | Acuse de recibo. | `/documents/:id/acknowledge` |
| **Archive** | Archivado. | `/documents/:id/archive` |

### 18.2 Regla

Cada pantalla respeta el estado del documento y los permisos del usuario. Las acciones disponibles se derivan del workflow, no de botones hardcodeados.

---

## 19. Document Table

### 19.1 Columnas

| Columna | Descripción |
|---|---|
| `code` | Código del documento. |
| `title` | Título. |
| `type` | Tipo de documento. |
| `version` | Versión vigente. |
| `status` | Estado actual. |
| `owner` | Propietario. |
| `responsible` | Responsable. |
| `effectiveDate` | Fecha de entrada en vigor. |
| `reviewDate` | Próxima revisión. |
| `updatedAt` | Última actualización. |

### 19.2 Características

- **Search**: búsqueda por código, título, tipo.
- **Filters**: por estado, tipo, propietario, rango de fechas.
- **Sorting**: por columnas permitidas.
- **Pagination**: server-side, max 25/50/100 por página.
- **Column visibility**: usuario puede ocultar columnas.
- **Selection**: para acciones masivas.

### 19.3 Regla

No descargar listas completas al navegador. Usar paginación server-side.

---

## 20. Document Detail

### 20.1 Secciones

| Sección | Contenido |
|---|---|
| **Header** | Código, título, estado, acciones principales. |
| **Metadata** | Tipo, clasificación, proceso, departamento, fechas. |
| **Current Version** | Versión vigente, archivo, hash, aprobaciones. |
| **Version History** | Lista de versiones con estados y fechas. |
| **Approvals** | Aprobadores, secuencia, decisiones. |
| **Distributions** | Destinatarios, estado de acuses. |
| **History** | Timeline de eventos. |
| **Related Entities** | Procesos, requisitos, riesgos, auditorías. |

### 20.2 Separación Visual

- **Current State**: versión vigente, estado actual, acciones disponibles.
- **History**: versiones anteriores, eventos pasados.

---

## 21. Document Version UI

### 21.1 Información Mostrada

| Campo | Descripción |
|---|---|
| `versionLabel` | 1.0, 1.1, 2.0. |
| `status` | Estado de la versión. |
| `createdAt` | Fecha de creación. |
| `createdBy` | Autor. |
| `approvedBy` | Aprobador (si aplica). |
| `publishedAt` | Fecha de publicación (si aplica). |
| `fileHash` | Hash SHA-256 (solo para usuarios autorizados). |
| `integrity` | Estado de integridad del archivo. |

### 21.2 Regla

Una versión publicada debe visualizarse como inmutable. No mostrar acciones de edición sobre ella.

---

## 22. Document Actions

### 22.1 Acciones Disponibles

| Acción | Estados Válidos | Permiso |
|---|---|---|
| `Edit` | `DRAFT` | `documents:update` |
| `Submit` | `DRAFT`, `REJECTED` | `documents:submit` |
| `Review` | `IN_REVIEW` | `documents:review` |
| `Approve` | `PENDING_APPROVAL` | `documents:approve` |
| `Reject` | `PENDING_APPROVAL` | `documents:reject` |
| `Publish` | `APPROVED` | `documents:publish` |
| `Distribute` | `PUBLISHED` | `documents:distribute` |
| `Acknowledge` | `PENDING` | `documents:acknowledge` |
| `Obsolete` | `PUBLISHED` | `documents:obsolete` |
| `Archive` | `OBSOLETE`, `CANCELLED` | `documents:archive` |

### 22.2 Regla

Mostrar solo acciones compatibles con:
- Current state
- Permission
- Resource authorization

---

## 23. File Upload UI

### 23.1 Componentes

- **Drag & Drop zone**: área de arrastre de archivos.
- **File selector**: selector tradicional.
- **Progress bar**: progreso de upload.
- **Validation feedback**: errores de tipo, tamaño, extensión.
- **Integrity state**: hash calculado, estado de validación.
- **Malware scanning state**: "Scanning..." hasta resultado.

### 23.2 Regla

No permitir publicar un archivo que todavía esté pendiente de validación o malware scan.

---

## 24. Audit UI

### 24.1 Pantallas

| Pantalla | Propósito | Ruta |
|---|---|---|
| **Audit Programs** | Lista de programas. | `/audit-programs` |
| **Audit List** | Auditorías del tenant. | `/audits` |
| **Audit Detail** | Detalle, checklist, findings, reporte. | `/audits/:id` |
| **Audit Planning** | Planificación de auditoría. | `/audits/:id/plan` |
| **Audit Team** | Asignación de equipo. | `/audits/:id/team` |
| **Checklist** | Ejecución de checklist. | `/audits/:id/checklist` |
| **Evidence** | Gestión de evidencias. | `/audits/:id/evidence` |
| **Findings** | Registro de hallazgos. | `/audits/:id/findings` |
| **Report** | Informe de auditoría. | `/audits/:id/report` |
| **Approval** | Aprobación de informe. | `/audits/:id/approve` |
| **Closure** | Cierre de auditoría. | `/audits/:id/close` |
| **Follow-up** | Seguimiento. | `/audits/:id/follow-up` |

---

## 25. Audit Execution UI

### 25.1 Optimización para Auditores

La interfaz de ejecución debe optimizarse para trabajo en campo:

- **Checklist navigation**: navegación secuencial o libre entre items.
- **Evidence attachment**: carga directa desde dispositivo.
- **Notes**: notas rápidas por item.
- **Findings**: generación inline desde checklist item.
- **Progress**: barra de progreso de checklist completada.
- **Save draft**: guardar progreso sin cerrar sesión.

### 25.2 Regla

Evitar perder información al cambiar de checklist item. Implementar autosave local o automático al backend.

---

## 26. Checklist UI

### 26.1 Item Individual

Cada item debe mostrar:

| Elemento | Descripción |
|---|---|
| **Requirement** | Requisito normativo vinculado (si aplica). |
| **Criterion** | Criterio de evaluación. |
| **Question** | Pregunta o punto de verificación. |
| **Status** | `CONFORMING`, `NONCONFORMING`, `NOT_APPLICABLE`, `OBSERVATION`. |
| **Notes** | Comentarios del auditor. |
| **Evidence** | Archivos o referencias adjuntas. |
| **Finding** | Hallazgo generado (si aplica). |

### 26.2 Progreso

Indicador global: `12 / 20 completed`.

---

## 27. Findings UI

### 27.1 Información Mostrada

| Elemento | Descripción |
|---|---|
| **Classification** | `CONFORMITY`, `OBSERVATION`, `NON_CONFORMITY`, `OPPORTUNITY`. |
| **Severity** | `MINOR`, `MAJOR`, `CRITICAL` (si aplica). |
| **Requirement** | Requisito normativo incumplido. |
| **Evidence** | Evidencia soporte. |
| **Description** | Descripción detallada. |
| **Auditor** | Usuario que identificó. |
| **Status** | Estado del hallazgo. |
| **Corrective Action** | Acción correctiva vinculada (si aplica). |

---

## 28. Nonconformity UI

### 28.1 Pantallas

| Pantalla | Propósito |
|---|---|
| **List** | Listado de no conformidades. |
| **Detail** | Detalle, análisis, acciones. |
| **Analysis** | Análisis de causa raíz. |
| **Root Cause** | Registro de causa raíz. |
| **Corrective Action** | Acciones correctivas. |
| **Verification** | Verificación de efectividad. |
| **Closure** | Cierre formal. |

### 28.2 Visualización

Mostrar claramente:
- **Current Status**: estado actual.
- **Next Required Action**: próxima acción esperada.

---

## 29. Risk UI

### 29.1 Pantallas

| Pantalla | Propósito |
|---|---|
| **Risk List** | Listado de riesgos. |
| **Risk Detail** | Detalle, evaluaciones, tratamientos. |
| **Assessment** | Evaluación cuantitativa/cualitativa. |
| **Treatment** | Planificación de tratamiento. |
| **Residual Risk** | Riesgo residual post-tratamiento. |
| **Monitoring** | Seguimiento. |

### 29.2 Visualización

Mostrar visualmente:
- **Probability**: probabilidad.
- **Impact**: impacto.
- **Risk Score**: score calculado.
- **Level**: nivel derivado.
- **Treatment Status**: estado del tratamiento.

### 29.3 Regla

No usar colores como único indicador. Complementar con texto, iconos y números.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Capacitaciones, Administración, Design System y UX Standards]

## 30. Training UI

### 30.1 Pantallas

| Pantalla | Propósito |
|---|---|
| **Courses** | Listado de cursos disponibles. |
| **Course Detail** | Detalle del curso, contenido, requisitos. |
| **Sessions** | Sesiones programadas. |
| **Session Detail** | Detalle de sesión, participantes, asistencia. |
| **Participants** | Lista de participantes. |
| **Attendance** | Registro de asistencia. |
| **Completion** | Estado de finalización, certificados. |

### 30.2 Visualización

Mostrar:
- **Upcoming**: sesiones próximas.
- **Overdue**: capacitaciones vencidas.
- **Completion Rate**: porcentaje de avance.

---

## 31. Indicators UI

### 31.1 Pantallas

| Pantalla | Propósito |
|---|---|
| **Indicator List** | Listado de indicadores. |
| **Indicator Detail** | Detalle, objetivo, mediciones. |
| **Measurements** | Registro de mediciones. |
| **Trends** | Tendencias históricas. |
| **Targets** | Metas y comparativas. |

### 31.2 Visualización

Separar claramente:
- **Actual Value**: valor medido.
- **Target**: valor objetivo.

---

## 32. Administration UI

### 32.1 Pantallas

| Pantalla | Propósito |
|---|---|
| **Users** | Administración de usuarios. |
| **Roles** | Administración de roles. |
| **Permissions** | Catálogo de permisos. |
| **Organization** | Configuración del tenant. |
| **Settings** | Configuración global. |
| **Audit Logs** | Visualización de logs de auditoría. |

### 32.2 Regla

Solo usuarios autorizados ven estas áreas. La UI oculta módulos según permisos efectivos.

---

## 33. Table System

### 33.1 Componente Reutilizable

Un único componente `Table` soporta todos los módulos.

### 33.2 Características

| Característica | Descripción |
|---|---|
| **Pagination** | Server-side, controles configurables. |
| **Sorting** | Por columnas permitidas. |
| **Filtering** | Filtros externos o inline. |
| **Search** | Búsqueda server-side. |
| **Column visibility** | Toggle de columnas. |
| **Selection** | Checkbox selection. |
| **Bulk actions** | Acciones masivas sobre selección. |
| **Loading** | Skeleton o spinner. |
| **Empty** | Empty state con acción. |
| **Error** | Mensaje de error con retry. |

### 33.3 Regla

Evitar implementar una tabla distinta para cada módulo. Un solo componente parametrizado.

---

## 34. Form System

### 34.1 Componente Reutilizable

Formularios genéricos con soporte para:

| Característica | Descripción |
|---|---|
| **Labels** | Texto accesible. |
| **Help text** | Ayuda contextual. |
| **Required** | Indicador visual y semántico. |
| **Validation** | Errores inline. |
| **Errors** | Mensajes específicos. |
| **Disabled** | Estado bloqueado. |
| **Loading** | Durante submit. |
| **Dirty state** | Indicador de cambios sin guardar. |
| **Confirmation** | Protección al salir. |

---

## 35. Form Validation

### 35.1 Client Validation

- Validación UX inmediata.
- Formato, rangos, campos requeridos.
- No sustituye validación backend.

### 35.2 Server Validation

- Backend siempre valida.
- Frontend muestra errores normalizados.
- No duplicar reglas complejas innecesariamente.

---

## 36. Modals

### 36.1 Uso Apropiado

Usar modals solo para:
- Acción puntual (confirmar, eliminar).
- Información contextual.
- Formularios cortos.

### 36.2 No Usar Modals Para

- Workflows complejos.
- Formularios largos.
- Flujos de múltiples pasos.

Para estos casos usar páginas o drawers.

---

## 37. Confirmations

### 37.1 Acciones que Requieren Confirmación

| Acción | Tipo |
|---|---|
| `Archive` | Destructiva. |
| `Delete` | Destructiva. |
| `Obsolete` | Irreversible. |
| `Reject` | Irreversible. |
| `Revoke` | Destructiva. |

### 37.2 Contenido del Modal

Debe explicar:
- Qué acción se realizará.
- Qué consecuencias tiene.
- Si es irreversible.

---

## 38. State Machine UI

### 38.1 Principio

La UI debe derivarse del estado real del backend.

No permitir mutaciones directas desde UI.

### 38.2 Flujo

```
Action
  → API call
    → Server validation
      → New state
        → UI refresh
```

### 38.3 Regla

El botón no cambia el estado localmente. El estado se actualiza solo después de confirmación backend.

---

## 39. Loading States

### 39.1 Tipos

| Tipo | Uso |
|---|---|
| **Initial loading** | Carga inicial de página. |
| **Skeleton** | Contenido pendiente de carga. |
| **Inline loading** | Dentro de contenedores. |
| **Button loading** | Durante submit. |
| **Background refresh** | Actualización silenciosa. |

### 39.2 Regla

Evitar spinners innecesarios. Preferir skeletons en listas y datos.

---

## 40. Empty States

### 40.1 Requisito

Cada módulo debe tener empty state.

### 40.2 Contenido

- **Qué significa**: explicación breve.
- **Qué puede hacer**: acción disponible.

### 40.3 Ejemplo

```
No documents found.

Documents will appear here once created.
[Create Document]
```

---

## 41. Error States

### 41.1 Códigos HTTP

| Código | Significado | UI |
|---|---|---|
| `400` | Bad Request | Mostrar detalles si son seguros. |
| `401` | Unauthorized | Redirigir a login. |
| `403` | Forbidden | Mostrar acceso denegado. |
| `404` | Not Found | Recurso inexistente. |
| `409` | Conflict | Conflicto de estado. |
| `422` | Validation Error | Mostrar errores de campo. |
| `429` | Too Many Requests | Backoff, reintentar. |
| `500` | Server Error | Error genérico, reportar. |

### 41.2 Regla

No asumir que todos los errores son "Something went wrong". Mensajes específicos cuando es seguro.

---

## 42. Business Errors

### 42.1 Errores Específicos

| Error | Mensaje UI |
|---|---|
| `VERSION_IMMUTABLE` | "This version cannot be modified." |
| `INVALID_STATE_TRANSITION` | "Action not allowed in current state." |
| `APPROVAL_REQUIRED` | "Approval is required before proceeding." |
| `CONCURRENT_MODIFICATION` | "Data was modified by another user. Please refresh." |

### 42.2 Regla

El mensaje debe ser comprensible sin exponer información sensible.

---

## 43. Notifications

### 43.1 Tipos

| Tipo | Uso |
|---|---|
| **Toast** | Feedback temporal de acciones. |
| **In-app** | Notificaciones persistentes dentro de la app. |
| **Notification Center** | Centro de notificaciones con historial. |
| **Unread count** | Indicador de no leídas. |

### 43.2 Regla

No usar toast para errores críticos que requieren atención persistente. Usar in-app notifications para eso.

---

## 44. Real-time

### 44.1 Eventos que Requieren Actualización

| Evento | Actualización |
|---|---|
| `document.published` | Refrescar listas de documentos. |
| `audit.assigned` | Notificar al auditor. |
| `nonconformity.created` | Actualizar dashboard. |
| `approval.decided` | Refrescar estado de documento. |
| `action.completed` | Actualizar métricas. |

### 44.2 Regla

No introducir realtime donde no sea necesario. Usar polling o manual refresh como fallback.

---

## 45. Search

### 45.1 Global Search

Si aplica, buscar en:
- Documents
- Audits
- Nonconformities
- Risks
- Users

### 45.2 Regla

Respetar permisos. No retornar resultados a los que el usuario no tiene acceso.

---

## 46. Filters

### 46.1 Características

| Característica | Descripción |
|---|---|
| **Persistibles** | Guardar filtros por usuario. |
| **Compartibles** | URL con filtros aplicados. |
| **URL-addressable** | Filtros en query params. |

### 46.2 Regla

No guardar información sensible en URLs innecesariamente.

---

## 47. Pagination

### 47.1 Estrategia

Para datasets grandes:
- Server-side pagination.
- No descargar miles de registros.

### 47.2 Implementación

- Páginas de 25/50/100.
- Cursor o offset según API.
- Indicadores de total y página actual.

---

## 48. Data Fetching

### 48.1 Estrategia Centralizada

- **API client**: único punto de entrada HTTP.
- **Query/cache**: TanStack Query para server state.
- **Local state**: Zustand para UI state.

### 48.2 Regla

No realizar fetches arbitrarios desde componentes. Usar hooks o queries tipadas.

---

## 49. Cache Invalidation

### 49.1 Después de Mutaciones

- Invalidar query relevante.
- Refrescar estado.
- Actualizar cache cuando sea seguro.

### 49.2 Operaciones Críticas

| Operación | Invalidación |
|---|---|
| `approve` | Document list, approvals, dashboard. |
| `publish` | Document list, distributions. |
| `archive` | Document list. |
| `close` | Audit list, findings. |

---

## 50. Unsaved Changes

### 50.1 Protección

Si el usuario tiene cambios sin guardar:
- Mostrar confirmación al navegar fuera.
- Especialmente en:
  - Document editor
  - Audit checklist
  - Root cause analysis
  - Corrective actions

---

## 51. Autosave

### 51.1 Entidades que Soportan Autosave

| Entidad | Frecuencia | Estado |
|---|---|---|
| Audit checklist | Cada cambio | Draft local + sync. |
| Document editor | Manual o timed | Indicador "Saving..." |
| Root cause | Manual | Confirmación antes de perder. |

### 51.2 Regla

No implementar autosave indiscriminadamente. Definir por entidad.

---

## 52. Accessibility

### 52.1 Objetivo

WCAG 2.2 AA como mínimo.

### 52.2 Requisitos

| Requisito | Descripción |
|---|---|
| **Keyboard navigation** | Todo accesible por teclado. |
| **Focus management** | Foco visible y lógico. |
| **Labels** | Labels semánticos. |
| **Semantic HTML** | Estructura correcta. |
| **Contrast** | Ratio mínimo 4.5:1. |
| **Screen readers** | ARIA labels donde corresponda. |
| **Error identification** | Errores asociados a campos. |
| **Reduced motion** | Respetar preferencia del usuario. |

### 52.3 Regla

No depender únicamente del color. Complementar con texto, iconos y patrones.

---

## 53. Responsive Design

### 53.1 Comportamiento

| Dispositivo | Enfoque |
|---|---|
| **Desktop** | Prioritario. Layout completo. |
| **Tablet** | Adaptaciones menores. |
| **Mobile** | Usable, no necesariamente feature-complete. |

### 53.2 Regla

El sistema empresarial prioriza desktop pero debe ser usable en pantallas menores.

---

## 54. Design System

### 54.1 Sistema Visual

Definir:
- **Typography**: jerarquía consistente.
- **Spacing**: escala de espacios.
- **Colors**: paleta semántica.
- **Borders**: estilos consistentes.
- **Radius**: radio de bordes.
- **Shadows**: niveles de elevación.
- **Icons**: familia única.
- **Buttons**: variantes consistentes.
- **Forms**: estilos unificados.
- **Tables**: diseño coherente.
- **Badges**: estados visuales.
- **Alerts**: niveles de alerta.

### 54.2 Regla

Evitar estilos por componente sin sistema. Todo componente sigue el design system.

---

## 55. Status Colors

### 55.1 Semántica

| Estado | Color | Uso |
|---|---|---|
| `success` | Verde | Completado, aprobado, publicado. |
| `warning` | Amarillo | Pendiente, vencido, en revisión. |
| `danger` | Rojo | Rechazado, vencido crítico, error. |
| `info` | Azul | Informativo, en progreso. |
| `neutral` | Gris | Inactivo, archivado, cancelado. |

### 55.2 Regla

Además del color mostrar:
- Texto del estado.
- Icono.
- Status label.

---

## 56. Typography

### 56.1 Jerarquía

| Nivel | Uso |
|---|---|
| **Page title** | Título de página. |
| **Section title** | Título de sección. |
| **Card title** | Título de tarjeta. |
| **Body** | Texto principal. |
| **Caption** | Texto auxiliar. |
| **Metadata** | Fechas, autor, ID. |

### 56.2 Regla

Consistencia global en tamaños, pesos y familias.

---

## 57. Iconography

### 57.1 Estrategia

- Una única familia de iconos.
- No mezclar estilos.
- Iconos complementan texto, no lo sustituyen cuando hay ambigüedad.

---

## 58. Responsive Tables

### 58.1 Mobile

En pantallas pequeñas:
- **Horizontal scroll** como mínimo.
- **Column priority**: ocultar columnas menos importantes.
- **Responsive cards**: transformar filas en cards si es necesario.

---

## 59. Security UI

### 59.1 No Almacenar

- Passwords.
- Secrets.
- Access tokens innecesariamente.
- MFA secrets.

### 59.2 Estrategia de Token

Según `AUTH_SPEC.md`:
- Access token en memoria.
- Refresh token en HttpOnly cookie.
- No persistir en localStorage.

---

## 60. Sensitive Data

### 60.1 Principio

Evitar mostrar:
- Información sensible innecesaria.
- Datos de otras organizaciones.
- Información administrativa a usuarios sin permiso.

### 60.2 Regla

Aplicar least privilege también en UI.

---

## 61. Audit Log UI

### 61.1 Pantalla

Mostrar:
- Timestamp.
- Actor.
- Action.
- Resource.
- Previous state.
- New state.
- Correlation ID.

### 61.2 Regla

No permitir modificar logs desde frontend. Solo lectura.

---

## 62. Export UI

### 62.1 Flujo

- Confirmar permisos.
- Mostrar progreso.
- Manejar archivos grandes.
- Registrar operación cuando corresponda.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Integración Técnica, Matrices, Testing y Definition of Done]
---

## 63. Internationalization

### 63.1 Estrategia

Idiomas soportados:
- Spanish (es)
- English (en)

### 63.2 Implementación

- Usar `i18next` como librería.
- No hardcodear textos críticos en componentes.
- Claves de traducción en archivos JSON por módulo.
- Detectar idioma desde configuración del usuario o navegador.

---

## 64. Date / Time

### 64.1 Fuente de Verdad

El backend es la fuente de verdad para timestamps.

### 64.2 Presentación

- Timezone: respetar configuración del usuario o tenant.
- Locale: `es-ES` o `en-US` según preferencia.
- Date format: `DD/MM/YYYY` o `MM/DD/YYYY`.
- Datetime format: `DD/MM/YYYY HH:mm` o equivalente.

### 64.3 Regla

La UI presenta correctamente la zona horaria configurada. No convertir timestamps en cliente sin confirmar timezone.

---

## 65. Number Formatting

### 65.1 Formatos

| Tipo | Ejemplo ES | Ejemplo EN |
|---|---|---|
| **Decimal** | 1.234,56 | 1,234.56 |
| **Percentage** | 85,5 % | 85.5% |
| **Currency** | $ 1.234,56 | $1,234.56 |
| **Score** | 4,5 / 5 | 4.5 / 5 |

### 65.2 Regla

Respetar locale del usuario.

---

## 66. Frontend Performance

### 66.1 Estrategias

| Estrategia | Aplicación |
|---|---|
| **Lazy loading** | Rutas y componentes pesados. |
| **Code splitting** | Por feature module. |
| **Pagination** | Server-side siempre. |
| **Memoization** | Componentes costosos. |
| **Image optimization** | Formatos modernos, srcset. |
| **Caching** | TanStack Query para datos. |
| **Bundle analysis** | Medir tamaño regularmente. |

### 66.2 Regla

No optimizar prematuramente. Medir antes de actuar.

---

## 67. Large Datasets

### 67.1 Regla

Nunca cargar listas potencialmente grandes completas al navegador.

### 67.2 Implementación

- Pagination server-side.
- Filtering server-side.
- Search server-side.
- Virtual scrolling solo para casos justificados.

---

## 68. Error Monitoring

### 68.1 Integración Conceptual

- **Frontend errors**: capturar errores no manejados.
- **API errors**: registrar códigos HTTP y business errors.
- **Performance errors**: detectar lentitud en queries.

### 68.2 Regla

No implementar proveedor específico si ARCHITECTURE.md no lo define.

---

## 69. Analytics

### 69.1 Política

No introducir analytics externos sin definir:
- Privacy.
- Purpose.
- Retention.
- Consent cuando aplique.

---

## 70. Component Architecture

### 70.1 Niveles

```
Primitive
  ↓
UI Component
  ↓
Feature Component
  ↓
Page
```

### 70.2 Definición

| Nivel | Descripción |
|---|---|
| **Primitive** | Elementos básicos: Button, Input, Modal. |
| **UI Component** | Combinaciones de primitives: DataTable, FormField. |
| **Feature Component** | Lógica de dominio: DocumentForm, AuditChecklist. |
| **Page** | Composiciones de features: DocumentDetailPage. |

### 70.3 Regla

Evitar componentes gigantes. Un componente debe hacer una cosa bien.

---

## 71. Domain Components

### 71.1 Componentes Reutilizables

| Componente | Propósito |
|---|---|
| `DocumentStatusBadge` | Badge de estado de documento. |
| `ApprovalTimeline` | Timeline de aprobaciones. |
| `AuditProgress` | Barra de progreso de auditoría. |
| `FindingSeverityBadge` | Badge de severidad de hallazgo. |
| `RiskLevelBadge` | Badge de nivel de riesgo. |
| `WorkflowActions` | Acciones derivadas del workflow. |
| `VersionHistory` | Historial de versiones. |
| `EvidenceList` | Lista de evidencias. |

---

## 72. Hooks / Composable Logic

### 72.1 Hooks Centralizados

| Hook | Propósito |
|---|---|
| `useAuth()` | Estado de autenticación. |
| `useTenant()` | Contexto de organización. |
| `usePermissions()` | Sistema de permisos. |
| `useDocumentWorkflow()` | Acciones de workflow documental. |
| `useAuditExecution()` | Ejecución de auditoría. |

### 72.2 Regla

No duplicar lógica. Centralizar en hooks reutilizables.

---

## 73. API Client

### 73.1 Configuración

| Aspecto | Definición |
|---|---|
| **Base URL** | Desde variable de entorno. |
| **Authentication** | Bearer token en Authorization header. |
| **Headers** | Content-Type, Accept, X-Correlation-ID. |
| **Error normalization** | Interceptor convierte errores a formato uniforme. |
| **Retry policy** | Reintentos para errores transitorios (5xx, network). |
| **Timeout** | 30s por defecto, configurable. |
| **Correlation ID** | Generar por request, propagar en headers. |

### 73.2 Regla

No hacer llamadas HTTP directamente desde componentes de presentación.

---

## 74. Correlation ID

### 74.1 Flujo

```
UI request
  → API (X-Correlation-ID header)
    → Domain operation
      → Audit log
        → Event
```

### 74.2 Implementación

- Generar UUID en frontend al iniciar operación crítica.
- Enviar en header `X-Correlation-ID`.
- Backend lo propaga y registra.
- UI lo muestra en logs o detalles de error para soporte.

---

## 75. Optimistic UI

### 75.1 Prohibido

Operaciones críticas sin confirmación backend:
- approve
- publish
- close
- archive
- reject

### 75.2 Permitido (con precaución)

Operaciones no críticas con rollback:
- Toggle de filtros.
- Edición de borradores locales.
- Navegación de checklist items.

### 75.3 Regla

Preferir confirmación del backend para operaciones que modifican estado durable.

---

## 76. Offline

### 76.1 Supuesto

No asumir offline support si no está definido en ARCHITECTURE.md.

### 76.2 Si se contempla

Definir claramente:
- Qué operaciones son seguras offline.
- Sincronización al reconectar.
- Conflictos de datos.

---

## 77. Testing

### 77.1 Tipos

| Tipo | Herramienta | Alcance |
|---|---|---|
| **Unit tests** | Vitest | Lógica pura, utils, hooks. |
| **Integration tests** | Vitest + MSW | Features con API mockeada. |
| **Component tests** | Testing Library | Componentes UI aislados. |
| **E2E tests** | Playwright | Flujos críticos completos. |
| **Accessibility tests** | Playwright / axe | Cumplimiento WCAG. |

---

## 78. Critical E2E Flows

### 78.1 Flujos Mínimos

| Flujo | Descripción |
|---|---|
| **Login → Dashboard** | Autenticación exitosa. |
| **Create Document → Submit → Review → Approve → Publish** | Ciclo documental completo. |
| **Create Audit → Execute → Finding → Nonconformity → Corrective Action → Verification → Close** | Ciclo de auditoría completo. |
| **Create Risk → Assess → Treatment → Reassess** | Gestión de riesgos. |
| **Training → Session → Attendance → Completion** | Capacitación completa. |

---

## 79. Permission Testing

### 79.1 Escenarios

| Escenario | Descripción |
|---|---|
| **Authorized** | Usuario con permiso puede acceder. |
| **Unauthorized** | Usuario sin permiso es redirigido o ve empty state. |
| **Wrong tenant** | Usuario no ve datos de otro tenant. |
| **Wrong resource** | Usuario no puede acceder a recurso específico. |
| **Expired session** | Redirigir a login. |
| **Disabled user** | Mostrar mensaje apropiado. |

---

## 80. Visual Regression

### 80.1 Si aplica

- Screenshots de páginas críticas.
- Estados responsive.
- Estados de error y loading.

---

## 81. Frontend Folder Structure

### 81.1 Estructura Recomendada

```
src/
├── app/
│   ├── providers/
│   ├── router/
│   ├── App.tsx
│   └── main.tsx
├── components/
│   ├── ui/                    # Primitivos
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   ├── Toast/
│   │   └── ...
│   ├── layouts/               # Layouts compartidos
│   │   ├── Shell/
│   │   ├── Sidebar/
│   │   └── Topbar/
│   └── domain/                # Componentes de dominio
│       ├── DocumentStatusBadge/
│       ├── ApprovalTimeline/
│       ├── AuditProgress/
│       ├── FindingSeverityBadge/
│       └── ...
├── features/
│   ├── auth/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── types/
│   ├── dashboard/
│   ├── documents/
│   ├── audits/
│   ├── findings/
│   ├── nonconformities/
│   ├── corrective-actions/
│   ├── risks/
│   ├── training/
│   ├── indicators/
│   ├── users/
│   ├── roles/
│   ├── organization/
│   ├── notifications/
│   └── settings/
├── hooks/
│   ├── useAuth.ts
│   ├── useTenant.ts
│   ├── usePermissions.ts
│   └── ...
├── lib/
│   ├── api/
│   ├── auth/
│   ├── permissions/
│   ├── format/
│   └── ...
├── types/
│   ├── api.ts
│   ├── domain.ts
│   └── ...
└── styles/
    └── globals.css
```

---

## 82. Route Matrix

### 82.1 Matriz de Rutas

| Route | Module | Authentication | Permission | Resource Authorization | Layout |
|---|---|---|---|---|---|
| `/login` | auth | Public | - | - | AuthLayout |
| `/forgot-password` | auth | Public | - | - | AuthLayout |
| `/dashboard` | dashboard | Authenticated | - | - | Shell |
| `/documents` | documents | Authenticated | `documents:read` | - | Shell |
| `/documents/:id` | documents | Authenticated | `documents:read` | Document access | Shell |
| `/documents/new` | documents | Authenticated | `documents:create` | - | Shell |
| `/audits` | audits | Authenticated | `audits:read` | - | Shell |
| `/audits/:id` | audits | Authenticated | `audits:read` | Audit access | Shell |
| `/audits/:id/checklist` | audits | Authenticated | `audits:execute` | Audit access | Shell |
| `/nonconformities` | nonconformities | Authenticated | `nonconformities:read` | - | Shell |
| `/risks` | risks | Authenticated | `risks:read` | - | Shell |
| `/training` | training | Authenticated | `trainings:read` | - | Shell |
| `/indicators` | indicators | Authenticated | `indicators:read` | - | Shell |
| `/users` | users | Authenticated | `users:read` | - | Shell |
| `/roles` | roles | Authenticated | `roles:read` | - | Shell |
| `/settings` | settings | Authenticated | `settings:read` | - | Shell |
| `/unauthorized` | - | Authenticated | - | - | Shell |
| `/not-found` | - | - | - | - | Public |

---

## 83. Component Matrix

### 83.1 Matriz de Componentes

| Component | Purpose | Reusable? | Accessibility | Data Source |
|---|---|---|---|---|
| `Button` | Acción primaria/secundaria | Yes | WCAG 2.2 AA | Props |
| `DataTable` | Tabla genérica con paginación | Yes | WCAG 2.2 AA | TanStack Query |
| `FormField` | Campo de formulario con validación | Yes | WCAG 2.2 AA | React Hook Form |
| `Modal` | Dialog overlay | Yes | WCAG 2.2 AA | Props / Zustand |
| `DocumentStatusBadge` | Badge de estado documental | Yes | WCAG 2.2 AA | Domain enum |
| `ApprovalTimeline` | Timeline de aprobaciones | Yes | WCAG 2.2 AA | Domain data |
| `AuditProgress` | Barra de progreso de auditoría | Yes | WCAG 2.2 AA | Domain data |
| `FindingSeverityBadge` | Badge de severidad | Yes | WCAG 2.2 AA | Domain enum |
| `RiskLevelBadge` | Badge de nivel de riesgo | Yes | WCAG 2.2 AA | Domain enum |
| `WorkflowActions` | Acciones de workflow | Yes | WCAG 2.2 AA | Workflow state |
| `VersionHistory` | Historial de versiones | Yes | WCAG 2.2 AA | Domain data |
| `EvidenceList` | Lista de evidencias | Yes | WCAG 2.2 AA | Domain data |

---

## 84. Workflow UI Matrix

### 84.1 Matriz de Workflow UI

| Aggregate | State | Action | Visible? | Permission | Confirmation | API Operation | Result |
|---|---|---|---|---|---|---|---|
| Document | DRAFT | Edit | Yes | `documents:update` | No | PATCH /documents/:id | Document updated |
| Document | DRAFT | Submit | Yes | `documents:submit` | No | POST /documents/:id/submit | Document in review |
| Document | IN_REVIEW | Review | Yes | `documents:review` | Yes | POST /documents/:id/review | Document approved/rejected |
| Document | PENDING_APPROVAL | Approve | Yes | `documents:approve` | Yes | POST /documents/:id/approve | Document approved |
| Document | PENDING_APPROVAL | Reject | Yes | `documents:reject` | Yes | POST /documents/:id/reject | Document rejected |
| Document | APPROVED | Publish | Yes | `documents:publish` | Yes | POST /documents/:id/publish | Document published |
| Document | PUBLISHED | Distribute | Yes | `documents:distribute` | No | POST /documents/:id/distribute | Document distributed |
| Document | PUBLISHED | Obsolete | Yes | `documents:obsolete` | Yes | POST /documents/:id/obsolete | Document obsolete |
| Audit | PLANNED | Start | Yes | `audits:start` | No | POST /audits/:id/start | Audit in progress |
| Audit | IN_PROGRESS | Complete | Yes | `audits:complete` | Yes | POST /audits/:id/complete | Audit completed |
| Audit | COMPLETED | Close | Yes | `audits:close` | Yes | POST /audits/:id/close | Audit closed |
| Nonconformity | OPEN | Root Cause | Yes | `nonconformities:update` | No | POST /nc/:id/root-cause | Root cause registered |
| Nonconformity | ROOT_CAUSE | Action | Yes | `nonconformities:update` | No | POST /nc/:id/action | Action created |
| Nonconformity | ACTION | Verify | Yes | `nonconformities:verify` | Yes | POST /nc/:id/verify | NC verified |
| Risk | IDENTIFIED | Assess | Yes | `risks:assess` | No | POST /risks/:id/assess | Risk assessed |
| Risk | ASSESSED | Treat | Yes | `risks:treat` | No | POST /risks/:id/treat | Treatment created |

---

## 85. Definition of Done

### 85.1 Checklist

- [x] Arquitectura definida.
- [x] Routing definido.
- [x] Navigation definida.
- [x] Layout definido.
- [x] Authentication UI definida.
- [x] Session handling definido.
- [x] Tenant context definido.
- [x] Permission system definido.
- [x] Resource authorization definido.
- [x] Dashboard definido.
- [x] Document UI definido.
- [x] Audit UI definido.
- [x] Finding UI definido.
- [x] Nonconformity UI definido.
- [x] Risk UI definido.
- [x] Training UI definido.
- [x] Indicators UI definido.
- [x] Administration UI definido.
- [x] Tables definido.
- [x] Forms definido.
- [x] Loading states definido.
- [x] Empty states definido.
- [x] Error states definido.
- [x] Notifications definido.
- [x] Search definido.
- [x] Filters definido.
- [x] Pagination definido.
- [x] Cache strategy definida.
- [x] Accessibility definida.
- [x] Responsive definido.
- [x] Design system definido.
- [x] Security frontend definida.
- [x] Audit logs UI definido.
- [x] i18n definido.
- [x] Date/time definido.
- [x] Performance definido.
- [x] Component architecture definida.
- [x] API client definido.
- [x] Correlation ID definido.
- [x] Testing definido.
- [x] E2E flows definidos.
- [x] Permission testing definido.
- [x] Route matrix definida.
- [x] Component matrix definida.
- [x] Workflow UI matrix definida.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice SECURITY.md.
- [x] No contradice WORKFLOW_SPEC.md.
- [x] No contradice DOCUMENT_MANAGEMENT.md.
- [x] No contradice AUDIT_SYSTEM.md.
- [x] No contradice DOMAIN.md.
- [x] No contradice API_SPEC.md.
- [x] No contradice ARCHITECTURE.md.

FRONTEND.md generado. Listo para revisión.

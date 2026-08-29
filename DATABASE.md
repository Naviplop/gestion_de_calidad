# QMS Platform — Database Specification

**Documento:** Especificación Maestra de Base de Datos
**Versión:** 1.0.0-DRAFT
**Estado:** Definición de Fase 1 — Modelo de Datos
**Motor:** PostgreSQL 16+
**ORM:** Prisma ORM
**Arquitectura:** Multi-Tenant — Shared Database / Shared Schema
**Identificador primario:** UUID
**Zona horaria:** `TIMESTAMPTZ` / UTC
**Almacenamiento de archivos:** S3 API / MinIO
**Última actualización:** 2026-08-24

---

## 1. Propósito

Este documento define el modelo de datos oficial de **QMS Platform**, Sistema de Gestión de Calidad empresarial orientado a la digitalización, control y trazabilidad de procesos relacionados con Sistemas de Gestión de la Calidad.

La base de datos debe soportar:

* Multi-tenancy.
* Aislamiento estricto entre organizaciones.
* Gestión de usuarios y permisos.
* Estructura organizacional.
* Gestión documental.
* Versionado inmutable.
* Flujos de aprobación.
* Distribución documental.
* Confirmaciones y firmas electrónicas internas.
* Auditorías.
* Hallazgos.
* No conformidades.
* Acciones correctivas.
* Gestión de riesgos y oportunidades.
* Capacitaciones.
* Indicadores.
* Notificaciones.
* Configuración por organización.
* Gestión de estándares ISO.
* Auditoría técnica inmutable.
* Preparación para evolución SaaS.

La base de datos constituye el **contrato persistente del dominio**. Ningún módulo de aplicación deberá crear estructuras paralelas que contradigan este documento.

---

# 2. Principios de Diseño

## 2.1 PostgreSQL como fuente de verdad

PostgreSQL será la fuente principal de verdad para todos los datos transaccionales del sistema.

Redis, S3/MinIO y otros componentes externos no sustituyen a PostgreSQL como sistema de registro.

---

## 2.2 UUID como identificador

Todas las entidades principales utilizarán UUID.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

No se utilizarán IDs incrementales expuestos públicamente.

Ventajas:

* Evita enumeración sencilla de recursos.
* Facilita sistemas distribuidos.
* Permite generación de identificadores sin coordinación central.
* Facilita futuras migraciones y particionamiento.

---

## 2.3 Fechas

Todas las fechas y timestamps persistentes utilizarán:

```sql
TIMESTAMPTZ
```

Los timestamps se almacenarán en UTC.

La presentación de fechas y zonas horarias será responsabilidad de la aplicación.

---

## 2.4 Multi-Tenancy

La estrategia oficial es:

```text
Shared Database
       +
Shared Schema
       +
organization_id
       +
Application Tenant Context
       +
PostgreSQL RLS
```

La arquitectura establece explícitamente `organization_id` como discriminador principal y exige aislamiento tanto en aplicación como, cuando corresponda, mediante PostgreSQL RLS.

### Regla fundamental

Nunca se confiará en un `organization_id` enviado por el frontend para autorizar una operación.

El tenant será determinado por:

```text
JWT
 ↓
TenantGuard
 ↓
RequestContext
 ↓
Prisma Client Extension
 ↓
PostgreSQL RLS
```

El frontend podrá enviar referencias funcionales, pero no podrá decidir a qué organización pertenece una operación.

---

# 3. Convenciones de nombres

## 3.1 Tablas

Las tablas utilizarán:

```text
snake_case
plural
```

Ejemplos:

```text
organizations
users
documents
document_versions
audit_logs
nonconformities
corrective_actions
```

---

## 3.2 Columnas

Las columnas utilizarán:

```text
snake_case
```

Ejemplo:

```text
organization_id
created_at
updated_at
created_by
approved_at
```

---

## 3.3 Foreign Keys

Las relaciones utilizarán:

```text
<entity>_id
```

Ejemplo:

```text
organization_id
document_id
user_id
role_id
file_asset_id
```

---

# 4. Clasificación de tablas

## 4.1 Core / Tenant

* `organizations`
* `organization_settings`
* `organization_standards`

## 4.2 Identity & Access

* `users`
* `roles`
* `permissions`
* `role_permissions`
* `user_roles`
* `refresh_tokens`
* `mfa_credentials`
* `mfa_recovery_codes`

## 4.3 Organizational Structure

* `areas`
* `processes`
* `process_owners`

## 4.4 Document Management

* `documents`
* `document_versions`
* `document_approvals`
* `document_distribution`
* `document_acknowledgements`
* `electronic_signature_events`

## 4.5 File Storage

* `file_assets`

## 4.6 Standards / ISO

* `standards`
* `standard_requirements`
* `organization_standards`

## 4.7 Audits

* `audit_programs`
* `audits`
* `audit_checklists`
* `audit_checklist_items`
* `audit_findings`

## 4.8 Nonconformities

* `nonconformities`
* `root_cause_analyses`
* `corrective_actions`
* `corrective_action_verifications`

## 4.9 Risks

* `risks`
* `risk_assessments`
* `risk_treatments`

## 4.10 Training

* `training_courses`
* `training_sessions`
* `training_participants`

## 4.11 Indicators

* `indicators`
* `indicator_measurements`

## 4.12 Notifications

* `notifications`
* `notification_preferences`

## 4.13 Audit / Compliance

* `audit_logs`

---

# 5. Entity Relationship Model

Conceptualmente:

```text
                         ┌────────────────────┐
                         │   organizations    │
                         └─────────┬──────────┘
                                   │
             ┌─────────────────────┼──────────────────────┐
             │                     │                      │
             ▼                     ▼                      ▼
         users                 areas                 processes
             │                                            │
             │                                            │
             ▼                                            ▼
        user_roles                                    documents
             │                                            │
             ▼                                            ▼
           roles                                  document_versions
             │                                            │
             ▼                                            ▼
       permissions                                   file_assets
                                                        │
                                                        ▼
                                             electronic_signatures


 organizations
      │
      ├────────── standards
      │                │
      │                ▼
      │       standard_requirements
      │
      ├────────── organization_standards
      │
      ├────────── audit_programs
      │                 │
      │                 ▼
      │               audits
      │                 │
      │                 ▼
      │           audit_findings
      │                 │
      │                 ▼
      │          nonconformities
      │                 │
      │                 ▼
      │          corrective_actions
      │
      ├────────── risks
      │
      ├────────── training
      │
      ├────────── indicators
      │
      ├────────── notifications
      │
      └────────── audit_logs
```

---

# 6. Organizations

## 6.1 organizations

Representa un tenant de la plataforma.

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(100),
    slug VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_organizations_slug UNIQUE (slug)
);
```

---

# 7. Organization Settings

## 7.1 organization_settings

Centraliza configuración específica del tenant.

```sql
CREATE TABLE organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    settings JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_organization_settings_org
        UNIQUE (organization_id)
);
```

Ejemplo:

```json
{
  "locale": "es-MX",
  "timezone": "America/Mexico_City",
  "riskMatrix": {
    "rows": 5,
    "columns": 5,
    "calculation": "probability * impact"
  },
  "limits": {
    "maxUsers": 25,
    "maxStorageGb": 10
  },
  "enabledModules": [
    "documents",
    "audits",
    "nonconformities"
  ]
}
```

La matriz de riesgos será configurable mediante JSON y no mediante una estructura rígida 5x5. Esta decisión forma parte de la arquitectura aprobada.

---

# 8. Users

## 8.1 users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_users_org_email
        UNIQUE (organization_id, email)
);
```

Los usuarios pertenecen obligatoriamente a una organización.

---

# 9. Roles and Permissions

## 9.1 roles

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`organization_id = NULL` podrá utilizarse exclusivamente para roles globales del sistema.

---

## 9.2 permissions

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(150) NOT NULL,
    module VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_permissions_code UNIQUE (code)
);
```

Ejemplos:

```text
documents:create
documents:read
documents:update
documents:delete
documents:approve
documents:publish
documents:download

audits:create
audits:read
audits:update

findings:create
findings:read

nonconformities:create
nonconformities:read
nonconformities:update
nonconformities:close

risks:create
risks:read
risks:update

training:create
training:read
training:manage
```

---

## 9.3 role_permissions

```sql
CREATE TABLE role_permissions (
    role_id UUID NOT NULL
        REFERENCES roles(id)
        ON DELETE CASCADE,

    permission_id UUID NOT NULL
        REFERENCES permissions(id)
        ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);
```

---

## 9.4 user_roles

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    role_id UUID NOT NULL
        REFERENCES roles(id)
        ON DELETE RESTRICT,

    PRIMARY KEY (user_id, role_id)
);
```

---

# 10. Authentication

## 10.1 refresh_tokens

Los refresh tokens deben poder revocarse individualmente.

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    token_hash VARCHAR(255) NOT NULL,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    replaced_by_token_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 11. MFA

## 11.1 mfa_credentials

```sql
CREATE TABLE mfa_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    secret_encrypted TEXT NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT FALSE,

    enrolled_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_mfa_credentials_user
        UNIQUE (user_id)
);
```

---

## 11.2 mfa_recovery_codes

```sql
CREATE TABLE mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    code_hash VARCHAR(255) NOT NULL,
    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

El sistema contempla ocho códigos de recuperación durante el enrolamiento MFA.

---

# 12. Organizational Structure

## 12.1 departments

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    parent_department_id UUID
        REFERENCES departments(id)
        ON DELETE NO ACTION,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_departments_org_name
        UNIQUE (organization_id, name)
);
```

---

## 12.2 areas

```sql
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    parent_area_id UUID
        REFERENCES areas(id)
        ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),

    description TEXT,

    manager_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 12.3 processes

```sql
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    area_id UUID
        REFERENCES areas(id)
        ON DELETE RESTRICT,

    parent_process_id UUID
        REFERENCES processes(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    owner_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    process_type VARCHAR(50),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_processes_org_code
        UNIQUE (organization_id, code)
);
```

---

# 13. File Assets

PostgreSQL **no almacenará archivos binarios**.

Solamente se almacenarán metadatos.

La arquitectura define explícitamente S3/MinIO como almacenamiento de objetos y PostgreSQL únicamente como almacén de metadatos.

## 13.1 file_assets

```sql
CREATE TABLE file_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    storage_provider VARCHAR(30) NOT NULL,
    bucket_name VARCHAR(255) NOT NULL,
    object_key TEXT NOT NULL,

    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(150) NOT NULL,

    file_size_bytes BIGINT NOT NULL,
    sha256_hash CHAR(64) NOT NULL,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_by UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_file_assets_storage_object
        UNIQUE (storage_provider, bucket_name, object_key)
);
```

Ejemplo de `object_key`:

```text
tenants/{organization_id}/documents/{document_id}/{version_id}_{file_uuid}.pdf
```

---

# 14. Document Management

## 14.1 documents

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    process_id UUID
        REFERENCES processes(id)
        ON DELETE RESTRICT,

    owner_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    document_type VARCHAR(50) NOT NULL,

    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',

    current_version_id UUID,

    is_controlled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_documents_org_code
        UNIQUE (organization_id, code)
);
```

Estados permitidos:

```text
DRAFT
IN_REVIEW
PENDING_APPROVAL
APPROVED
PUBLISHED
OBSOLETE
CANCELLED
```

---

# 15. Document Versions

Las versiones son históricas e inmutables.

Nunca se actualizará una versión publicada para representar un nuevo contenido.

Se crea una nueva versión.

## 15.1 document_versions

```sql
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    document_id UUID NOT NULL
        REFERENCES documents(id)
        ON DELETE RESTRICT,

    file_asset_id UUID NOT NULL
        REFERENCES file_assets(id)
        ON DELETE RESTRICT,

    version_major INTEGER NOT NULL,
    version_minor INTEGER NOT NULL,

    version_label VARCHAR(30) NOT NULL,

    file_hash CHAR(64) NOT NULL,

    change_reason TEXT NOT NULL,

    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',

    created_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    approved_by UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    approved_at TIMESTAMPTZ,

    published_at TIMESTAMPTZ,

    CONSTRAINT uk_document_versions_number
        UNIQUE (
            document_id,
            version_major,
            version_minor
        ),

    CONSTRAINT ck_document_versions_major
        CHECK (version_major >= 1),

    CONSTRAINT ck_document_versions_minor
        CHECK (version_minor >= 0)
);
```

Ejemplos:

```text
1.0
1.1
1.2
2.0
2.1
```

### Regla

```text
Cambio menor → incrementa minor

Cambio estructural/mayor → incrementa major
```

Una versión histórica no deberá eliminarse físicamente.

---

# 16. Document Approvals

## 16.1 document_approvals

```sql
CREATE TABLE document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    document_version_id UUID NOT NULL
        REFERENCES document_versions(id)
        ON DELETE RESTRICT,

    approver_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    sequence INTEGER NOT NULL,

    status VARCHAR(30) NOT NULL,

    comments TEXT,

    decided_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_document_approval_sequence
        UNIQUE (document_version_id, sequence)
);
```

Estados:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

---

# 17. Document Distribution

## 17.1 document_distribution

```sql
CREATE TABLE document_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    document_version_id UUID NOT NULL
        REFERENCES document_versions(id)
        ON DELETE RESTRICT,

    user_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    area_id UUID
        REFERENCES areas(id)
        ON DELETE RESTRICT,

    distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    revoked_at TIMESTAMPTZ
);
```

La distribución debe permitir asignar documentos a usuarios o áreas.

---

# 18. Document Acknowledgements

## 18.1 document_acknowledgements

```sql
CREATE TABLE document_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    document_version_id UUID NOT NULL
        REFERENCES document_versions(id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    acknowledgement_hash CHAR(64) NOT NULL,

    CONSTRAINT uk_document_ack_user_version
        UNIQUE (document_version_id, user_id)
);
```

---

# 19. Electronic Signature Events

La firma inicial del sistema es una **firma/confirmación electrónica interna**, no una firma electrónica avanzada o cualificada con validez legal externa.

## 19.1 electronic_signature_events

```sql
CREATE TABLE electronic_signature_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,

    action VARCHAR(100) NOT NULL,

    signed_content_hash CHAR(64) NOT NULL,

    signature_hash CHAR(64) NOT NULL,

    ip_address INET,
    user_agent TEXT,

    metadata JSONB NOT NULL DEFAULT '{}',

    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

No se deberá presentar esta funcionalidad como sustituto de una PKI, e.firma, eIDAS u otra firma cualificada.

---

# 20. ISO Standards

## 20.1 standards

Catálogo global de normas soportadas.

```sql
CREATE TABLE standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,

    version VARCHAR(50),

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_standards_code_version
        UNIQUE (code, version)
);
```

Ejemplos:

```text
ISO 9001
ISO 14001
ISO 45001
ISO 27001
```

---

# 21. Standard Requirements

## 21.1 standard_requirements

Representa cláusulas/requisitos de una norma.

```sql
CREATE TABLE standard_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    standard_id UUID NOT NULL
        REFERENCES standards(id)
        ON DELETE RESTRICT,

    parent_requirement_id UUID
        REFERENCES standard_requirements(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,

    description TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_standard_requirement_code
        UNIQUE (standard_id, code)
);
```

Ejemplo conceptual:

```text
ISO 9001
 ├── 4 Contexto de la organización
 ├── 5 Liderazgo
 ├── 6 Planificación
 ├── 7 Apoyo
 ├── 8 Operación
 ├── 9 Evaluación del desempeño
 └── 10 Mejora
```

---

# 22. Organization Standards

## 22.1 organization_standards

Relaciona una organización con las normas que administra.

```sql
CREATE TABLE organization_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    standard_id UUID NOT NULL
        REFERENCES standards(id)
        ON DELETE RESTRICT,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    adopted_at TIMESTAMPTZ,

    target_certification_date DATE,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_organization_standard
        UNIQUE (organization_id, standard_id)
);
```

---

# 23. Audit Programs

## 23.1 audit_programs

```sql
CREATE TABLE audit_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    description TEXT,

    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    responsible_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_audit_program_dates
        CHECK (period_end >= period_start)
);
```

---

# 24. Audits

## 24.1 audits

```sql
CREATE TABLE audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    audit_program_id UUID
        REFERENCES audit_programs(id)
        ON DELETE RESTRICT,

    process_id UUID
        REFERENCES processes(id)
        ON DELETE RESTRICT,

    lead_auditor_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,

    audit_type VARCHAR(50),

    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,

    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,

    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',

    scope TEXT,
    objective TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_audits_org_code
        UNIQUE (organization_id, code)
);
```

---

# 25. Audit Checklists

## 25.1 audit_checklists

```sql
CREATE TABLE audit_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    audit_id UUID NOT NULL
        REFERENCES audits(id)
        ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 25.2 audit_checklist_items

```sql
CREATE TABLE audit_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    checklist_id UUID NOT NULL
        REFERENCES audit_checklists(id)
        ON DELETE RESTRICT,

    requirement_id UUID
        REFERENCES standard_requirements(id)
        ON DELETE RESTRICT,

    question TEXT NOT NULL,

    response VARCHAR(50),

    evidence TEXT,

    comments TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 26. Audit Findings

## 26.1 audit_findings

```sql
CREATE TABLE audit_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    audit_id UUID NOT NULL
        REFERENCES audits(id)
        ON DELETE RESTRICT,

    checklist_item_id UUID
        REFERENCES audit_checklist_items(id)
        ON DELETE RESTRICT,

    requirement_id UUID
        REFERENCES standard_requirements(id)
        ON DELETE RESTRICT,

    finding_type VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    evidence TEXT,

    severity VARCHAR(30),

    identified_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    identified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Tipos sugeridos:

```text
CONFORMITY
OBSERVATION
OPPORTUNITY
MINOR_NONCONFORMITY
MAJOR_NONCONFORMITY
```

---

# 27. Nonconformities

## 27.1 nonconformities

```sql
CREATE TABLE nonconformities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    audit_id UUID
        REFERENCES audits(id)
        ON DELETE RESTRICT,

    finding_id UUID
        REFERENCES audit_findings(id)
        ON DELETE RESTRICT,

    process_id UUID
        REFERENCES processes(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    severity VARCHAR(30) NOT NULL,

    detected_at TIMESTAMPTZ NOT NULL,

    responsible_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    closed_at TIMESTAMPTZ,

    closed_by UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_nonconformities_org_code
        UNIQUE (organization_id, code)
);
```

---

# 28. Root Cause Analysis

## 28.1 root_cause_analyses

Debe soportar:

* 5 Why.
* Ishikawa.
* Análisis libre.

```sql
CREATE TABLE root_cause_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    nonconformity_id UUID NOT NULL
        REFERENCES nonconformities(id)
        ON DELETE RESTRICT,

    methodology VARCHAR(50) NOT NULL,

    analysis_data JSONB NOT NULL DEFAULT '{}',

    conclusion TEXT,

    created_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Ejemplo:

```json
{
  "why1": "...",
  "why2": "...",
  "why3": "...",
  "why4": "...",
  "why5": "..."
}
```

---

# 29. Corrective Actions

## 29.1 corrective_actions

```sql
CREATE TABLE corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    nonconformity_id UUID NOT NULL
        REFERENCES nonconformities(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,

    description TEXT NOT NULL,

    responsible_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    due_date DATE,

    completed_at TIMESTAMPTZ,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    effectiveness_required BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_corrective_actions_org_code
        UNIQUE (organization_id, code)
);
```

---

# 30. Corrective Action Verification

## 30.1 corrective_action_verifications

```sql
CREATE TABLE corrective_action_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    corrective_action_id UUID NOT NULL
        REFERENCES corrective_actions(id)
        ON DELETE RESTRICT,

    verifier_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    effectiveness_status VARCHAR(30) NOT NULL,

    evidence TEXT,
    comments TEXT,

    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 31. Risks

## 31.1 risks

```sql
CREATE TABLE risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    process_id UUID
        REFERENCES processes(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    risk_type VARCHAR(30) NOT NULL,

    owner_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_risks_org_code
        UNIQUE (organization_id, code)
);
```

---

# 32. Risk Assessments

## 32.1 risk_assessments

```sql
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    risk_id UUID NOT NULL
        REFERENCES risks(id)
        ON DELETE RESTRICT,

    probability NUMERIC(10,4) NOT NULL,
    impact NUMERIC(10,4) NOT NULL,

    score NUMERIC(20,6),

    calculation_data JSONB NOT NULL DEFAULT '{}',

    assessed_by UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

La fórmula no estará hardcodeada en la estructura de la base de datos.

La configuración será determinada por `organization_settings`.

---

# 33. Risk Treatments

## 33.1 risk_treatments

```sql
CREATE TABLE risk_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    risk_id UUID NOT NULL
        REFERENCES risks(id)
        ON DELETE RESTRICT,

    strategy VARCHAR(50) NOT NULL,

    description TEXT NOT NULL,

    responsible_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    due_date DATE,

    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Estrategias:

```text
AVOID
MITIGATE
TRANSFER
ACCEPT
EXPLOIT
ENHANCE
SHARE
```

---

# 34. Training

## 34.1 training_courses

```sql
CREATE TABLE training_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    description TEXT,

    related_document_id UUID
        REFERENCES documents(id)
        ON DELETE RESTRICT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 34.2 training_sessions

```sql
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    course_id UUID NOT NULL
        REFERENCES training_courses(id)
        ON DELETE RESTRICT,

    instructor_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    scheduled_at TIMESTAMPTZ NOT NULL,

    location VARCHAR(255),

    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 34.3 training_participants

```sql
CREATE TABLE training_participants (
    session_id UUID NOT NULL
        REFERENCES training_sessions(id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    attendance_status VARCHAR(30),

    completed_at TIMESTAMPTZ,

    evaluation_score NUMERIC(5,2),

    PRIMARY KEY (session_id, user_id)
);
```

---

# 35. Indicators

## 35.1 indicators

```sql
CREATE TABLE indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    process_id UUID
        REFERENCES processes(id)
        ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,

    name VARCHAR(255) NOT NULL,
    description TEXT,

    unit VARCHAR(50),

    target_value NUMERIC(20,6),

    calculation_definition JSONB NOT NULL DEFAULT '{}',

    responsible_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_indicators_org_code
        UNIQUE (organization_id, code)
);
```

---

## 35.2 indicator_measurements

```sql
CREATE TABLE indicator_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    indicator_id UUID NOT NULL
        REFERENCES indicators(id)
        ON DELETE RESTRICT,

    measurement_date DATE NOT NULL,

    value NUMERIC(20,6) NOT NULL,

    target_value NUMERIC(20,6),

    comments TEXT,

    recorded_by UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 36. Notifications

## 36.1 notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    type VARCHAR(100) NOT NULL,

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    entity_type VARCHAR(100),
    entity_id UUID,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 36.2 notification_preferences

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    notification_type VARCHAR(100) NOT NULL,

    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_notification_preference
        UNIQUE (user_id, notification_type)
);
```

---

# 37. Immutable Audit Log

Este es uno de los componentes críticos del sistema.

El audit log debe ser:

```text
Append Only
+
Tenant Scoped
+
Hash Chained
+
Tamper Evident
```

La arquitectura exige trazabilidad extrema e inmutabilidad sobre cambios documentales, hallazgos, no conformidades y firmas.

## 37.1 audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE RESTRICT,

    actor_id UUID
        REFERENCES users(id)
        ON DELETE RESTRICT,

    action VARCHAR(150) NOT NULL,

    entity_type VARCHAR(150) NOT NULL,
    entity_id UUID,

    payload JSONB,

    ip_address INET,
    user_agent TEXT,

    correlation_id UUID NOT NULL,

    previous_hash CHAR(64),
    event_hash CHAR(64) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Hash Chain

Conceptualmente:

```text
EVENT 1
   │
   └── event_hash = H(event)

EVENT 2
   │
   ├── previous_hash = EVENT 1.event_hash
   └── event_hash = H(event + previous_hash)

EVENT 3
   │
   ├── previous_hash = EVENT 2.event_hash
   └── event_hash = H(event + previous_hash)
```

Esto permite detectar alteraciones posteriores.

---

# 38. Audit Log Immutability Rules

La aplicación no podrá ejecutar:

```sql
UPDATE audit_logs;
```

ni:

```sql
DELETE FROM audit_logs;
```

Los registros deberán insertarse exclusivamente mediante el mecanismo autorizado por el backend.

Se recomienda reforzar esta regla mediante:

* permisos PostgreSQL;
* triggers;
* roles de base de datos;
* políticas RLS;
* separación de usuario de migración y usuario runtime.

---

# 39. Foreign Key Policy

## 39.1 Regla general

Las entidades históricas o de trazabilidad **no deben utilizar `ON DELETE CASCADE`**.

Ejemplo correcto:

```sql
REFERENCES documents(id)
ON DELETE RESTRICT
```

Esto evita que eliminar una entidad principal destruya automáticamente el historial.

---

## 39.2 Tablas donde se prohíbe CASCADE

Especialmente:

```text
document_versions
document_approvals
document_distribution
document_acknowledgements
electronic_signature_events
audit_logs
audit_findings
nonconformities
root_cause_analyses
corrective_actions
corrective_action_verifications
risk_assessments
risk_treatments
indicator_measurements
```

---

# 40. Soft Delete

Las entidades de negocio relevantes no deberán eliminarse físicamente cuando su eliminación pueda comprometer trazabilidad.

Cuando corresponda se utilizará:

```text
is_active
deleted_at
deleted_by
```

La eliminación lógica deberá registrarse en `audit_logs`.

Los documentos controlados nunca deberán desaparecer físicamente por una operación administrativa normal.

---

# 41. Multi-Tenant Isolation

Todas las tablas tenant-scoped deberán contener:

```sql
organization_id UUID NOT NULL
```

Excepciones:

* `permissions`
* `standards`
* `standard_requirements`

Estas tablas pueden ser globales del sistema.

---

# 42. RLS

PostgreSQL Row Level Security será una segunda barrera de aislamiento.

Ejemplo conceptual:

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant_isolation
ON documents
USING (
    organization_id =
    current_setting('app.current_organization_id')::uuid
);
```

El backend deberá establecer el contexto de sesión dentro de una transacción:

```sql
SET LOCAL app.current_organization_id = '...';
```

No deberá utilizarse un valor global persistente que pueda contaminar conexiones reutilizadas del pool.

---

# 43. Indexing Strategy

Índices mínimos obligatorios:

```sql
CREATE INDEX idx_users_org
ON users(organization_id);

CREATE INDEX idx_users_org_active
ON users(organization_id, is_active);

CREATE INDEX idx_documents_org
ON documents(organization_id);

CREATE INDEX idx_documents_org_status
ON documents(organization_id, status);

CREATE INDEX idx_document_versions_org
ON document_versions(organization_id);

CREATE INDEX idx_document_versions_document
ON document_versions(document_id);

CREATE INDEX idx_file_assets_org
ON file_assets(organization_id);

CREATE INDEX idx_audits_org_status
ON audits(organization_id, status);

CREATE INDEX idx_findings_org_status
ON audit_findings(organization_id, status);

CREATE INDEX idx_nonconformities_org_status
ON nonconformities(organization_id, status);

CREATE INDEX idx_corrective_actions_org_status
ON corrective_actions(organization_id, status);

CREATE INDEX idx_risks_org_status
ON risks(organization_id, status);

CREATE INDEX idx_notifications_user_unread
ON notifications(user_id, read_at);

CREATE INDEX idx_audit_logs_org_created
ON audit_logs(organization_id, created_at);

CREATE INDEX idx_audit_logs_entity
ON audit_logs(organization_id, entity_type, entity_id);

CREATE INDEX idx_audit_logs_correlation
ON audit_logs(correlation_id);
```

---

# 44. JSONB Policy

JSONB está permitido exclusivamente cuando exista una necesidad real de estructura dinámica.

Usos permitidos:

```text
organization_settings
risk configuration
risk calculation metadata
root cause analysis
indicator calculation definition
notification metadata
audit payload
signature metadata
file metadata
```

No utilizar JSONB para esconder entidades relacionales que deberían tener una tabla propia.

Incorrecto:

```json
{
  "users": [...]
}
```

Correcto:

```text
users
user_roles
roles
permissions
```

---

# 45. Data Integrity Constraints

Las restricciones críticas deberán implementarse en PostgreSQL cuando sea posible.

Ejemplos:

```text
UNIQUE
NOT NULL
CHECK
FOREIGN KEY
```

No se deberá depender exclusivamente de validaciones del frontend.

La aplicación podrá validar adicionalmente, pero PostgreSQL será la última barrera de integridad.

---

# 46. Transaction Boundaries

Las siguientes operaciones deberán ejecutarse dentro de transacciones:

### Publicación documental

```text
Create/validate version
        ↓
Validate approvals
        ↓
Update document status
        ↓
Register publication
        ↓
Create audit event
```

### Cierre de no conformidad

```text
Validate corrective actions
        ↓
Verify effectiveness
        ↓
Close nonconformity
        ↓
Create audit event
```

### Firma electrónica

```text
Validate user
        ↓
Validate resource
        ↓
Generate hash
        ↓
Persist signature event
        ↓
Persist audit event
```

---

# 47. Concurrency Control

Las operaciones críticas deberán contemplar concurrencia.

Especialmente:

* creación de versiones;
* aprobación;
* publicación;
* cierre de no conformidades;
* evaluación de riesgos;
* modificación de configuración.

Cuando corresponda utilizar:

```text
transaction
SELECT ... FOR UPDATE
optimistic concurrency
unique constraints
```

No se deberá depender únicamente de validaciones previas en el frontend.

---

# 48. Document Version Integrity

Una versión documental deberá conservar como mínimo:

```text
document_id
version_major
version_minor
file_asset_id
file_hash
change_reason
created_by
created_at
approved_by
approved_at
published_at
```

El hash deberá corresponder al archivo almacenado en S3/MinIO.

La descarga del documento deberá generar trazabilidad.

La arquitectura define que los objetos no serán públicos y que las descargas deberán autenticarse y quedar registradas.

---

# 49. Audit Event Structure

Un evento de auditoría deberá contener conceptualmente:

```json
{
  "action": "DOCUMENT_PUBLISHED",
  "entity": "document_version",
  "entityId": "uuid",
  "actorId": "uuid",
  "organizationId": "uuid",
  "correlationId": "uuid",
  "payload": {},
  "previousHash": "...",
  "eventHash": "...",
  "createdAt": "2026-08-24T16:00:00Z"
}
```

---

# 50. Correlation ID

Toda operación HTTP relevante deberá generar o propagar:

```text
correlation_id
```

Este identificador deberá permitir reconstruir una operación distribuida.

Ejemplo:

```text
HTTP Request
   ↓
NestJS
   ↓
Prisma
   ↓
Redis
   ↓
S3
```

Todos los eventos relacionados deberán poder asociarse mediante `correlation_id`.

La arquitectura establece `correlation_id` como obligatorio para la trazabilidad distribuida.

---

# 51. Data Retention

La política de retención deberá configurarse por organización y normativa aplicable.

Nunca deberá implementarse una eliminación automática indiscriminada de:

```text
audit_logs
document_versions
electronic_signature_events
nonconformities
corrective_actions
```

La retención deberá ser una decisión explícita del sistema.

---

# 52. Database Roles

Se recomienda separar como mínimo:

```text
qms_migrator
qms_runtime
qms_readonly
qms_backup
```

### qms_migrator

Permisos:

```text
CREATE
ALTER
DROP
```

### qms_runtime

Permisos únicamente necesarios para ejecutar la aplicación.

### qms_readonly

Para reporting y consultas analíticas.

### qms_backup

Exclusivo para mecanismos de respaldo.

---

# 53. Prisma

Prisma será el ORM principal.

La estructura deberá seguir:

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

La arquitectura establece explícitamente Prisma como capa de datos y contempla raw queries controladas para casos complejos como analítica o RLS.

### Regla

No se utilizará SQL generado manualmente desde múltiples módulos de aplicación.

Las consultas especiales deberán centralizarse en una capa de infraestructura.

---

# 54. Prisma and RLS

Prisma no debe considerarse sustituto de RLS.

La estrategia será:

```text
Application isolation
        +
Prisma tenant filtering
        +
PostgreSQL RLS
```

Esto proporciona defensa en profundidad.

---

# 55. Seed Data

El sistema deberá incluir seeds para:

### System permissions

```text
auth:login
users:create
users:read
users:update
users:disable

documents:create
documents:read
documents:update
documents:approve
documents:publish
documents:download

audits:create
audits:read
audits:update

findings:create
findings:read

nonconformities:create
nonconformities:read
nonconformities:update
nonconformities:close

risks:create
risks:read
risks:update

training:create
training:read

indicators:create
indicators:read

reports:read
```

### System roles

```text
SUPER_ADMIN
ORGANIZATION_ADMIN
QUALITY_MANAGER
AUDITOR
PROCESS_OWNER
DOCUMENT_CONTROLLER
USER
```

Los permisos deberán determinar autorización; el nombre del rol por sí solo nunca deberá constituir la autorización final.

---

# 56. Initial Seed Organization

Para desarrollo únicamente:

```text
Organization:
QMS Demo Organization
```

No deberán incluirse credenciales reales en seeds.

Las contraseñas de desarrollo deberán utilizarse únicamente en ambientes locales.

---

# 57. Backup Requirements

PostgreSQL deberá contar con:

```text
Daily encrypted pg_dump
+
WAL Archiving
+
Point-in-Time Recovery
```

Objetivos:

```text
RPO < 1 hour
RTO < 2 hours
```

La arquitectura establece estos objetivos explícitamente.

---

# 58. Migration Rules

Toda modificación estructural deberá realizarse mediante migración.

Nunca modificar directamente producción mediante:

```sql
ALTER TABLE ...
```

sin que exista una migración versionada.

Formato:

```text
YYYYMMDDHHMMSS_description
```

Ejemplo:

```text
20260824103000_create_organizations
20260824110000_create_users
20260824113000_create_documents
```

---

# 59. Migration Safety

Las migraciones deberán ser:

* Repetibles conceptualmente.
* Versionadas.
* Revisables por Git.
* Probadas antes de producción.
* Compatibles con despliegues controlados.

Para cambios destructivos:

```text
Expand
  ↓
Migrate
  ↓
Validate
  ↓
Contract
```

No se deberán eliminar columnas críticas en una única migración si existe riesgo de incompatibilidad con una versión anterior de la aplicación.

---

# 60. Testing Requirements

La base de datos deberá probar:

### Integridad

```text
Foreign keys
Unique constraints
Check constraints
Nullability
```

### Multi-tenancy

```text
Tenant A cannot read Tenant B
Tenant A cannot update Tenant B
Tenant A cannot delete Tenant B
Tenant A cannot infer Tenant B data
```

### RLS

```text
SELECT
INSERT
UPDATE
DELETE
```

### Auditoría

```text
Audit event generated
Hash chain valid
Previous hash valid
Tampering detected
```

### Documentos

```text
Version creation
Version immutability
Approval workflow
Publication
Obsolete version
```

La arquitectura considera obligatorias las pruebas específicas de aislamiento multi-tenant.

---

# 61. Performance Guidelines

Las consultas tenant-scoped deberán comenzar conceptualmente por:

```text
organization_id
```

Ejemplo:

```sql
SELECT *
FROM documents
WHERE organization_id = $1
  AND status = $2;
```

Evitar consultas que recorran tablas completas cuando exista una combinación de:

```text
organization_id
+
status
+
created_at
```

Los índices deberán diseñarse considerando el patrón real de consulta.

---

# 62. Pagination

Las APIs no deberán descargar colecciones ilimitadas.

Inicialmente:

```text
default limit: 20
maximum limit: 100
```

Para grandes volúmenes se deberá considerar cursor pagination.

---

# 63. Reporting

Los reportes complejos no deberán impactar innecesariamente las tablas transaccionales.

Se podrá evolucionar posteriormente hacia:

```text
read replicas
materialized views
reporting schema
data warehouse
```

pero estas decisiones pertenecen a una fase posterior.

---

# 64. SaaS Readiness

El modelo está diseñado desde el inicio para evolucionar hacia SaaS.

Cada organización puede tener:

```json
{
  "limits": {
    "maxUsers": 25,
    "maxStorageGb": 10
  },
  "enabledModules": [
    "documents",
    "audits",
    "nonconformities"
  ]
}
```

La arquitectura establece explícitamente límites por tenant y feature flags como preparación para SaaS.

---

# 65. Entidades fuera de la base de datos

Los siguientes elementos NO deberán almacenarse directamente como datos binarios en PostgreSQL:

```text
PDF
DOCX
XLSX
Images
Videos
Scanned documents
Attachments
```

Solamente:

```text
file_assets
```

contendrá sus metadatos.

---

# 66. Seguridad de Datos

Datos sensibles deberán protegerse mediante:

```text
TLS
Encryption at rest
Application-level encryption
Secrets management
RBAC
RLS
Audit logs
Least privilege
```

Especialmente:

```text
password_hash
mfa secrets
refresh tokens
recovery codes
```

Nunca deberán almacenarse valores secretos en texto plano.

---

# 67. Data Classification

## Public

Información que pueda exponerse públicamente.

## Internal

Información operativa interna.

## Confidential

Información del Sistema de Gestión.

## Restricted

Información sensible relacionada con:

```text
credentials
authentication
MFA
security events
internal audit data
```

La aplicación deberá evitar devolver datos Restricted innecesariamente en las APIs.

---

# 68. Prohibited Practices

Queda prohibido:

```text
❌ Guardar archivos binarios en PostgreSQL
❌ Confiar en organization_id enviado por frontend
❌ Usar IDs incrementales públicos
❌ Eliminar audit_logs
❌ Modificar document_versions históricas
❌ Usar CASCADE indiscriminadamente
❌ Guardar contraseñas en texto plano
❌ Guardar secretos MFA sin cifrado
❌ Crear tablas por tenant
❌ Crear bases de datos por tenant en la arquitectura inicial
❌ Ocultar entidades relacionales complejas dentro de JSONB
❌ Ejecutar SQL estructural manualmente en producción
```

---

# 69. Source of Truth

En caso de conflicto entre:

```text
Frontend
Backend
Prisma
Database
```

la integridad de PostgreSQL será la última barrera.

Sin embargo, la fuente arquitectónica del modelo deberá ser:

```text
DATABASE.md
        ↓
schema.prisma
        ↓
Prisma migrations
        ↓
PostgreSQL
```

Cualquier cambio de modelo deberá actualizar este documento antes de modificar el esquema definitivo.

---

# 70. Evolución del Modelo

El modelo deberá evolucionar mediante versiones:

```text
DATABASE.md 1.0
      ↓
schema.prisma
      ↓
migration
      ↓
DATABASE.md 1.1
```

Cada cambio significativo deberá documentar:

```text
Qué cambió
Por qué cambió
Impacto
Migración
Compatibilidad
Rollback strategy
```

---

# 71. Estado de Implementación

| Área                  | Estado   |
| --------------------- | -------- |
| Multi-tenancy         | DEFINIDO |
| Organizations         | DEFINIDO |
| Users                 | DEFINIDO |
| RBAC                  | DEFINIDO |
| MFA                   | DEFINIDO |
| Areas                 | DEFINIDO |
| Processes             | DEFINIDO |
| File Assets           | DEFINIDO |
| Documents             | DEFINIDO |
| Document Versions     | DEFINIDO |
| Document Approvals    | DEFINIDO |
| Document Distribution | DEFINIDO |
| Electronic Signatures | DEFINIDO |
| ISO Standards         | DEFINIDO |
| Audits                | DEFINIDO |
| Findings              | DEFINIDO |
| Nonconformities       | DEFINIDO |
| Root Cause Analysis   | DEFINIDO |
| Corrective Actions    | DEFINIDO |
| Risks                 | DEFINIDO |
| Training              | DEFINIDO |
| Indicators            | DEFINIDO |
| Notifications         | DEFINIDO |
| Immutable Audit Log   | DEFINIDO |
| RLS                   | DEFINIDO |
| Prisma                | DEFINIDO |
| Backup Strategy       | DEFINIDO |
| SaaS Readiness        | DEFINIDO |

---

# 72. Database Implementation Order

La implementación deberá realizarse en el siguiente orden:

```text
01. organizations
02. organization_settings

03. users
04. roles
05. permissions
06. role_permissions
07. user_roles

08. refresh_tokens
09. mfa_credentials
10. mfa_recovery_codes

11. departments
12. areas
13. processes

14. file_assets

14. documents
15. document_versions
16. document_approvals
17. document_distribution
18. document_acknowledgements
19. electronic_signature_events

20. standards
21. standard_requirements
22. organization_standards

23. audit_programs
24. audits
25. audit_checklists
26. audit_checklist_items
27. audit_findings

28. nonconformities
29. root_cause_analyses
30. corrective_actions
31. corrective_action_verifications

32. risks
33. risk_assessments
34. risk_treatments

35. training_courses
36. training_sessions
37. training_participants

38. indicators
39. indicator_measurements

40. notifications
41. notification_preferences

42. audit_logs

43. indexes
44. constraints
45. RLS policies
46. triggers
47. seeds
```

---

# 73. Final Architectural Contract

Este documento establece que QMS Platform utilizará:

```text
PostgreSQL 16+
        │
        ├── UUID
        ├── TIMESTAMPTZ
        ├── JSONB selectivo
        ├── Foreign Keys
        ├── Constraints
        ├── Indexes
        └── Row Level Security
                │
                ▼
             Prisma
                │
                ▼
             NestJS
                │
                ├── Tenant Context
                ├── RBAC
                ├── Audit
                └── Domain Services
```

El aislamiento tenant será de defensa en profundidad:

```text
JWT
 ↓
TenantGuard
 ↓
RequestContext
 ↓
Prisma Tenant Filter
 ↓
PostgreSQL RLS
 ↓
Data
```

La trazabilidad documental será:

```text
Document
   ↓
Document Version
   ↓
File Asset
   ↓
SHA-256
   ↓
Approval
   ↓
Electronic Signature
   ↓
Audit Log
   ↓
Hash Chain
```

Y el flujo de calidad principal será:

```text
AUDIT
  ↓
FINDING
  ↓
NONCONFORMITY
  ↓
ROOT CAUSE
  ↓
CORRECTIVE ACTION
  ↓
EFFECTIVENESS
  ↓
CLOSURE
  ↓
AUDIT LOG
```

---

# 74. Próximo Artefacto

Una vez aprobado `DATABASE.md`, el siguiente artefacto técnico deberá ser:

```text
prisma/schema.prisma
```

Este archivo deberá implementar **exclusivamente** el modelo definido aquí.

Después:

```text
DATABASE.md
      ↓
schema.prisma
      ↓
Prisma migrations
      ↓
RLS migrations
      ↓
Seed
      ↓
Database integration tests
```

No deberá generarse `schema.prisma` hasta que el modelo de datos de este documento sea considerado estable.

# Especificación Maestra de Arquitectura de Software: QMS Platform

**Documento:** Arquitectura de Sistema y Especificación Técnica Maestra  
**Versión:** 1.0.0-DRAFT  
**Estado:** Definición de Fase 1 (Arquitectura y Especificación)  
**Autor:** Equipo Senior de Arquitectura & Calidad Empresarial  

---

## 1. Resumen Ejecutivo

Este documento establece las bases arquitectónicas para **QMS Platform**, un Sistema de Gestión de Calidad (QMS) empresarial diseñado nativamente bajo un modelo **Multi-tenant**. El sistema digitaliza y automatiza los procesos del Sistema de Gestión de la Calidad (SGC), facilitando el cumplimiento de la norma ISO 9001:2015 y proyecciones hacia otros marcos (ISO 14001, ISO 45001, ISO 27001).

El objetivo principal es proveer una plataforma altamente trazable, segura e interconectada, estructurada desde el primer día como una solución empresarial escalable orientada a transformarse en un **SaaS comercial**.

---

## 2. Definición de Objetivos y Alcance

### 2.1 Objetivos
* **Integridad y Trazabilidad Extrema:** Garantizar inmutabilidad y auditoría completa sobre cambios documentales, hallazgos, no conformidades y firmas electrónicas internas.
* **Aislamiento Multi-tenant Riguroso:** Asegurar la segregación de datos entre organizaciones mediante contextos de autenticación estrictos a nivel de aplicación y base de datos.
* **Alta Mantenibilidad y Modularidad:** Emplear una arquitectura por capas desacoplada y guiada por dominios en backend y frontend.
* **Preparación para Certificación Estándar:** Proporcionar las herramientas para que las empresas gestionen su SGC sin afirmar falsamente que el software otorga la certificación por sí solo.

### 2.2 Alcance (Fase 1 a Fase 26)
* Gestión de Estructura Organizacional (Áreas, Procesos, Parámetros).
* Gestión de Usuarios, Autenticación (JWT/Refresh Tokens, TOTP MFA) y Control de Acceso (RBAC Granular).
* Gestión Documental Completa (Versionado real inmutable, almacenamiento S3, flujos de aprobación).
* Control de Distribución y Firmas/Confirmaciones Electrónicas Internas.
* Gestión de Auditorías (Programas, Listas de Chequeo, Hallazgos).
* No Conformidades y Acciones Correctivas (Metodologías 5-Why, Ishikawa, Análisis Libre).
* Gestión de Riesgos y Oportunidades (Matrices de riesgo dinámicas/configurables).
* Capacitaciones, Indicadores de Gestión y Centro de Notificaciones.
* Audit Log Inmutable, Motor de Reportes (PDF, Excel, CSV) y Dashboards Ejecutivos.

### 2.3 Fuera de Alcance (Inicios)
* **Validez Legal de Firma Electrónica Avanzada/Cualificada:** Inicialmente se implementa firma/confirmación electrónica interna basada en hash y timestamps. La integración con PKI externas (e.g., eIDAS, e.firma) se difiere a etapas posteriores.
* **Integración de Billing y Pasarelas de Pago:** Se configuran los límites arquitectónicos (límites de almacenamiento, planes, usuarios), pero no la pasarela transaccional.
* **Integraciones Nativas de Terceros:** Conectores con WhatsApp, Teams, Slack o ERPs quedan fuera de esta fase inicial.

---

## 3. Observaciones sobre Requisitos e Inconsistencias Detectadas

> **REVISIÓN CRÍTICA DE REQUISITOS:**
>
> 1. **Inconsistencia en Escala de Matrices de Riesgo:** El requisito original solicitaba flexibilidad. *Decisión Arquitectónica:* La matriz de riesgo NO se modelará con filas/columnas fijas (e.g., 5x5). Se abstraerá en configuraciones JSON Schema guardadas en `organization_settings`, permitiendo ejes variables (3x3, 5x5, 6x6) y ponderaciones calculadas por expresión.
> 2. **Almacenamiento de Archivos en DB:** Se reafirma que PostgreSQL **nunca** almacenará blobs ni binarios. Solo almacenará metadatos (`file_assets`). Los binarios residirán en S3 (o MinIO en desarrollo).
> 3. **Confianza en `organization_id` en Frontend:** *Regla Estricta:* El frontend NUNCA podrá inyectar el `organization_id` en el *payload* o cuerpo de las peticiones para autorizar operaciones. El backend resolverá la organización a través del JWT verificado en los Guards de NestJS.

---

## 4. Arquitectura Tecnológica Base y Justificación

El stack propuesto combina tipado estricto end-to-end, alto rendimiento y una curva de adopción madura en el ecosistema empresarial.

```
                  ┌──────────────────────────────────────────┐
                  │          Client / Browser               │
                  │   React 18+ / TS / Vite / Tailwind     │
                  └────────────────────┬─────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │       Reverse Proxy / Cloudflare         │
                  │              Nginx                       │
                  └────────────────────┬─────────────────────┘
                                       │
                  ┌────────────────────┴─────────────────────┐
                  │           NestJS API Gateway             │
                  │   Auth / RBAC / Multi-Tenant Guards    │
                  └──────┬─────────────────┬─────────────────┘
                         │                 │
         ┌───────────────┴───┐         ┌───┴───────────────┐
         │                   │         │                   │
         ▼                   ▼         ▼                   ▼
┌─────────────────┐ ┌──────────────────┐ ┌───────────────────┐
│ PostgreSQL 16+  │ │  Redis (Cache/   │ │ S3 / MinIO Object │
│ (Prisma ORM /   │ │  BullMQ Jobs)    │ │ Storage           │
│ Tenant Isolation│ └──────────────────┘ └───────────────────┘
└─────────────────┘
```

### 4.1 Justificación del Stack Tecnológico

| Componente | Tecnología Seleccionada | Alternativas Analizadas | Justificación y Análisis Comparativo |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | NestJS (TypeScript) | Express.js, Fastify puro | **Selección: NestJS.** Express requiere arquitectura ad-hoc. NestJS proporciona Inyección de Dependencias nativa, modularidad clara, integración limpia de DTOs con `class-validator` y soporte nativo para arquitectura por capas. |
| **ORM / Data Layer** | Prisma ORM | TypeORM, Sequelize, Kysely | **Selección: Prisma.** Ofrece seguridad de tipos end-to-end, migraciones declarativas y generación de clientes. *Matiz:* Para consultas complejas de analítica o RLS, se complementará con raw queries controladas. |
| **Frontend Platform** | React + Vite + TS | Next.js (SSR), Angular | **Selección: React + Vite (SPA).** Al ser una plataforma empresarial detrás de autenticación, el SSR/SEO de Next.js añade complejidad de servidor innecesaria. Vite proporciona compilación ultra rápida y empaquetado optimizado. |
| **State & Data Fetching** | TanStack Query | Redux Toolkit, Zustand solo | **Selección: TanStack Query + Zustand.** TanStack Query gestiona el estado del servidor, caché, invalidaciones y estados de carga. Zustand manejará únicamente estado local de UI (modales, drawers, filtros). |
| **Estilos & UI System** | Tailwind CSS | Material UI, Ant Design | **Selección: Tailwind CSS.** Permite construir un Design System desacoplado, evitando layouts pesados y sobreescritura de estilos complejos común en AntD o MUI. |
| **Object Storage** | S3 API (MinIO / AWS S3) | Filesystem local | **Selección: S3 API.** Garantiza que la aplicación sea stateless y escale horizontalmente en contenedores Docker sin depender de almacenamiento persistente en el nodo API. |

---

## 5. Arquitectura Multi-Tenant

Para garantizar la máxima seguridad y aislamiento de datos sin disparar los costos operativos en fases iniciales, se evalúan tres enfoques:

### 5.1 Análisis Comparativo de Estrategias Multi-Tenant

| Criterio | Discriminado por Columna (`organization_id`) | Schema por Tenant (`PostgreSQL Schemas`) | Database por Tenant |
| :--- | :--- | :--- | :--- |
| **Aislamiento** | Logico (Medio-Alto si se impone via Software/RLS) | Lógico Fuerte (Schemas separados) | Físico Absoluto |
| **Costo / Recursos** | Muy Bajo (Una sola DB y pool) | Medio (Crece según número de tenants) | Muy Alto (Múltiples DBs) |
| **Complejidad Migraciones** | Muy Simple (Una migración aplica a todo) | Alta (Iterar migraciones por schema) | Muy Alta |
| **Mantenibilidad SaaS** | Alta | Media | Baja para miles de clientes |

**DECISIÓN ARQUITECTÓNICA:**  
Se adopta la estrategia de **Shared Database, Shared Schema con Discriminador `organization_id`**, reforzado obligatoriamente a nivel de capa de aplicación mediante **Tenant Context Interceptors/Guards en NestJS** y opcionalmente **Row Level Security (RLS) en PostgreSQL**.

### 5.2 Mecanismo de Aislamiento en Backend
1. **Extracción de Contexto:** El usuario se autentica. El JWT verificado contiene `userId` y `organizationId`.
2. **NestJS Context Injection:** Un Guard/Interceptor extrae la organización y la inyecta en el objeto `RequestContext` de la petición.
3. **Prisma Middleware / Client Extension:** Cada operación de lectura/escritura adjunta automáticamente el filtro `{ organizationId: requestContext.organizationId }`.

---

## 6. Modelo de Autenticación, Autorización y Seguridad

### 6.1 Autenticación y Tokens
* **Password Hashing:** Argon2id con parámetros configurados para resistencia contra ataques de fuerza bruta en GPU (Time Cost: 3, Memory Cost: 64MB, Parallelism: 4).
* **Estrategia JWT Dual:**
  * `Access Token`: Vida corta (15 minutos). Firmado con HS256/RS256. Contiene: `sub` (userId), `org` (organizationId), `roles`, `permissionsHash`.
  * `Refresh Token`: Vida larga (7 días). Almacenado en cookie `HttpOnly`, `SameSite=Strict`, `Secure`. Guardado en base de datos/Redis con rotación en cada uso (Refresh Token Rotation) para detectar reutilizaciones maliciosas.
* **MFA (Multi-Factor Authentication):** Basado en TOTP (RFC 6238) usando aplicaciones estándar (Google Authenticator, Authy).
  * Fase de enrolamiento: Generación de secret criptográfico, código QR y 8 códigos de recuperación de un solo uso (*backup codes*) encriptados en DB.

### 6.2 Autorización Granular (RBAC)
No se auditarán roles estáticos en el código. El sistema verifica **permisos específicos**.

```
[Usuario] ──(1:N)──> [UserRole] <──(N:1)── [Role] ──(1:N)──> [RolePermission] <──(N:1)── [Permission]
```

* **Matriz de Permisos (Ejemplos de Formato Estándar):**
  * `documents:create`, `documents:read`, `documents:update`, `documents:delete`
  * `documents:approve`, `documents:publish`, `documents:download`
  * `audits:create`, `audits:update`, `audits:read`, `findings:create`
  * `nonconformities:create`, `nonconformities:close`

---

## 7. Estrategia de Archivos y Seguridad de Objetos

1. **Upload Process:**
   * El cliente solicita al backend una URL firmada (`Presigned PUT URL`).
   * El backend valida los metadatos (tipo MIME permitido, tamaño máximo según plan).
   * El cliente sube el archivo directamente a S3/MinIO.
   * El cliente notifica al backend la finalización; el backend calcula/registra el hash (SHA-256) y valida el archivo.

2. **Download Process:**
   * Ningún archivo en Object Storage es público.
   * La descarga requiere autenticación. El backend genera una `Presigned GET URL` con tiempo de expiración corto (e.g., 5 minutos).
   * Registra el evento en `audit_logs` (quién descargó qué documento y versión).

3. **Estructura de Rutas en Object Storage:**
   ```text
   s3://qms-storage-bucket/tenants/{organization_id}/documents/{document_id}/{version_id}_{file_uuid}.pdf
   ```

---

## 8. Arquitectura y Modelo Conceptual de Datos (PostgreSQL)

El siguiente diagrama ER ilustra las relaciones principales entre los módulos del sistema:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  organizations  │───┬───<     users       │───┬───<   user_roles    │
└─────────────────┘   │   └─────────────────┘   │   └─────────────────┘
         │            │            │            │            │
         │            │   ┌────────┴────────┐   └───────┐    │
         │            └───<   documents     │           │    ▼
         │                └────────┬────────┘       ┌─────────────────┐
         │                         │                │      roles      │
         │                         ▼                └────────┬────────┘
         │                ┌─────────────────┐                │
         │                │document_versions│                ▼
         │                └─────────────────┘       ┌─────────────────┐
         │                         │                │ role_permissions│
         │                         ▼                └─────────────────┘
         │                ┌─────────────────┐
         └───────────────<│     audits      │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  nonconformities│
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │corrective_actions│
                          └─────────────────┘
```

### 8.1 Definición Inicial de Tablas Principales

```sql
-- 1. ORGANIZACIONES (TENANTS)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USUARIOS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_users_org_email UNIQUE (organization_id, email)
);

-- 3. ROLES Y PERMISOS
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL si es sistema
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g. 'documents:create'
    module VARCHAR(50) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. GESTIÓN DOCUMENTAL
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- MANUAL, POLICY, PROCEDURE, INSTRUCTION, FORMAT, REGISTRATION
    process_id UUID,
    owner_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_REVIEW, PENDING_APPROVAL, APPROVED, PUBLISHED, OBSOLETE, CANCELLED
    current_version_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_documents_org_code UNIQUE (organization_id, code)
);

CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL, -- e.g. "v1.0"
    file_asset_id UUID NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    change_reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TRACEABILIDAD Y AUDIT LOG INMUTABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    correlation_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDICES CRÍTICOS PARA DESEMPEÑO Y ISOLATION
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_documents_org_status ON documents(organization_id, status);
CREATE INDEX idx_doc_versions_doc ON document_versions(document_id);
CREATE INDEX idx_audit_logs_org_entity ON audit_logs(organization_id, entity, entity_id);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id);
```

---

## 9. Flujos Principales e Interconexión entre Módulos

El valor del QMS reside en la **trazabilidad integral entre eventos del sistema**.

```
  ┌──────────────┐     1. Genera Hallazgo     ┌──────────────┐
  │  AUDITORÍA   │───────────────────────────>│   HALLAZGO   │
  └──────────────┘                            └──────┬───────┘
                                                     │
                                                     │ 2. Clasifica como
                                                     ▼
  ┌──────────────┐     4. Implementa plan     ┌──────────────┐
  │  ACCIÓN      │<───────────────────────────│     NO       │
  │ CORRECTIVA   │                            │ CONFORMIDAD  │
  └──────┬───────┘                            └──────────────┘
         │
         │ 3. Causa raíz requiere actualizar estándar
         ▼
  ┌──────────────┐     5. Nueva Versión       ┌──────────────┐
  │  DOCUMENTO   │───────────────────────────>│  CAPACITA-   │
  │ (Procedimiento)                           │  CIÓN        │
  └──────────────┘                            └──────────────┘
```

---

## 10. Especificación de Arquitectura Frontend y Backend

### 10.1 Frontend (React + TypeScript)
* **Estructura de Carpetas basada en Características (Feature-Based):**
  ```text
  src/
  ├── app/               # Providers, router configuration, global styles
  ├── components/        # UI Kit desacoplado (Button, Modal, Table, Input)
  ├── features/          # Módulos del dominio
  │   ├── auth/          # Login, MFA, Refresh handling
  │   ├── documents/     # Componentes, hooks, API calls de Documentos
  │   │   ├── api/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── pages/
  │   │   └── types/
  │   ├── audits/
  │   └── nonconformities/
  ├── hooks/             # Custom hooks globales (useAuth, useTenant)
  ├── lib/               # Clientes configurados (Axios/Fetch, TanStack Query)
  └── types/             # Tipos globales TypeScript
  ```

### 10.2 Backend (NestJS Modular)
* **Estructura por Módulos Desacoplados:**
  ```text
  src/
  ├── app.module.ts
  ├── main.ts
  ├── common/            # Filters, Guards, Interceptors, Decorators
  │   ├── decorators/    # @RequirePermissions(), @CurrentTenant()
  │   ├── guards/        # JwtAuthGuard, PermissionsGuard, TenantGuard
  │   ├── interceptors/  # LoggingInterceptor, TransformInterceptor
  │   └── dto/           # PaginationQueryDto, StandardResponseDto
  ├── database/          # Prisma Module, migrations, seeds
  └── modules/           # Dominio
      ├── auth/
      ├── users/
      ├── documents/
      ├── audits/
      └── nonconformities/
  ```

---

## 11. Estándar de Respuestas y Contratos API REST

Todas las peticiones del sistema devuelven un sobre (*envelope*) uniforme:

### 11.1 Respuesta Exitosa (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "c39e4a82-1d2e-4b8a-98c4-123456789abc",
    "code": "PR-CAL-001",
    "title": "Procedimiento de Control de Documentos",
    "status": "PUBLISHED"
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1,
    "correlationId": "8f3b2a1c-9d4e-4f5a-8b1c-2d3e4f5a6b7c"
  }
}
```

### 11.2 Respuesta de Error (`400 Bad Request`, `403 Forbidden`, etc.)
```json
{
  "success": false,
  "error": {
    "code": "DOCUMENT_STATUS_INVALID",
    "message": "Cannot publish a document that is in DRAFT status. Current status: DRAFT.",
    "details": [
      {
        "field": "status",
        "issue": "Transition from DRAFT to PUBLISHED is not allowed."
      }
    ],
    "correlationId": "8f3b2a1c-9d4e-4f5a-8b1c-2d3e4f5a6b7c"
  }
}
```

---

## 12. Estrategia de Infraestructura, Contenedores y DevOps

### 12.1 Entorno de Desarrollo Local (`docker-compose.yml`)
El entorno local levantará la arquitectura completa con aislación mediante Docker Compose:
* `frontend`: Node/Vite Dev Server (Puerto 5173)
* `backend`: NestJS Dev Server con auto-reload (Puerto 3000)
* `postgres`: PostgreSQL 16 (Puerto 5432)
* `redis`: Redis 7 para Caché y Queues (Puerto 6379)
* `minio`: MinIO S3 Emulator (Puerto 9000 API, 9001 Console)

### 12.2 Observabilidad & Backups
* **Logging:** Structured JSON logs utilizando Winston/Pino. Cada log incluye `correlationId`, `organizationId` y `userId`.
* **Health Checks:** Endpoints `/health` (Liveness) y `/ready` (Readiness comprobando conexiones activas a DB, Redis y S3).
* **Estrategia de Backups:**
  * **PostgreSQL:** `pg_dump` diario cifrado + WAL Archiving para Point-In-Time Recovery (PITR). Target RPO: < 1 hora. Target RTO: < 2 horas.
  * **Object Storage:** S3 Bucket Versioning habilitado + Replicación en segunda región/proveedor.

---

## 13. Estrategia de Testing y Calidad de Código

| Nivel de Test | Alcance / Cobertura | Herramienta |
| :--- | :--- | :--- |
| **Pruebas Unitarias** | Reglas de negocio, servicios, validaciones DTO, transformadores. | Vitest / Jest |
| **Pruebas de Integración** | Repositorios, consultas Prisma, interacciones con Redis y S3. | Supertest + Testcontainers (DB real) |
| **Pruebas Multi-tenant Isolation** | **OBLIGATORIAS.** Verificar que llamadas de Tenant A fallen sistemáticamente al intentar leer/modificar recursos de Tenant B. | Jest + Supertest |
| **Pruebas End-to-End (E2E)** | Flujos completos (Login -> Crear Documento -> Workflow de Aprobación -> Publicación). | Playwright |

---

## 14. Preparación para Evolución SaaS

Aunque la primera versión responderá a un modelo de una sola empresa o despliegue inicial, la arquitectura incluye las siguientes salvaguardas arquitectónicas para habilitar comercialización SaaS sin refactorización:

1. **Límites por Tenant (`organization_settings`):**
   ```json
   {
     "limits": {
       "maxUsers": 25,
       "maxStorageGb": 10,
       "enabledModules": ["documents", "audits", "nonconformities"]
     }
   }
   ```
2. **Feature Flags:** Guards de backend que verifican si el módulo solicitado está habilitado dentro del plan de la organización.
3. **Abstracción de Contexto:** Ningún servicio accede directamente a variables globales de entorno para tomar decisiones de negocio; siempre consumen la configuración de la organización solicitante.

---

## 15. Decisión de Arquitectura y Siguientes Pasos (Roadmap de Fases)

### Resumen de Decisiones Clave (ADR Sintetizado)
* **ADR-001:** Se utiliza arquitectura **Multi-Tenant Lógica** basada en `organization_id` con aislamiento forzado en la capa de aplicación (NestJS Guards + Middleware Prisma).
* **ADR-002:** Inmutabilidad estricta de documentos y auditorías. No se permite actualización directa de binarios; toda modificación exige la creación de un nuevo registro `document_versions`.
* **ADR-003:** API REST estandarizada con `correlation_id` obligatorio para toda la trazabilidad distribuida.
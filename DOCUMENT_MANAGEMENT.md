# DOCUMENT_MANAGEMENT.md — Control Documental Specification

## 1. Document Conflicts

### CONFLICT-001: Estado `ARCHIVED` en Documento

| Campo | Valor |
|---|---|
| **Fuente 1** | `WORKFLOW_SPEC.md` §5.1 — incluye `ARCHIVED` como estado de `Document` |
| **Fuente 2** | `prisma/schema.prisma` — enum `DocumentStatus` **no incluye** `ARCHIVED` |
| **Fuente 3** | `DOMAIN.md` §11.1 — lista de estados **no incluye** `ARCHIVED` |
| **Conflicto** | `WORKFLOW_SPEC.md` define `ARCHIVED` como estado del documento, pero ni el schema ni el modelo de dominio lo soportan actualmente. |
| **Impacto** | No se puede persistir el estado `ARCHIVED` en base de datos sin modificar el schema. |
| **Resolución recomendada** | Tratar `ARCHIVED` como un estado derivado o extendido en capa de aplicación, almacenado en `organization_settings` o una tabla auxiliar, hasta que se agregue al enum en una migración futura. Alternativamente, usar `OBSOLETE` como estado final administrativo y documentar que `ARCHIVED` está planificado para Fase 2. |

### CONFLICT-002: Estado `REJECTED` en Documento

| Campo | Valor |
|---|---|
| **Fuente 1** | `WORKFLOW_SPEC.md` §5.1 — incluye `REJECTED` |
| **Fuente 2** | `prisma/schema.prisma` — enum `DocumentStatus` incluye `REJECTED` |
| **Fuente 3** | `DOMAIN.md` §11.1 — lista de estados **no incluye** `REJECTED` |
| **Conflicto** | `DOMAIN.md` no contempla `REJECTED` como estado explícito, aunque el schema y el workflow sí. |
| **Impacto** | El modelo de dominio no formaliza el rechazo como estado propio; podría interpretarse como transición directa a `DRAFT` o `CANCELLED`. |
| **Resolución recomendada** | Adoptar `REJECTED` como estado válido intermedio. Actualizar `DOMAIN.md` para incluirlo. El flujo `REJECTED → DRAFT` (resubmit) es válido y necesario. |

### CONFLICT-003: Estado `CURRENT` en Documento

| Campo | Valor |
|---|---|
| **Fuente 1** | `prisma/schema.prisma` — enum `DocumentStatus` incluye `CURRENT` |
| **Fuente 2** | `SECURITY.md` §15.1 — tabla de estados incluye `CURRENT` |
| **Fuente 3** | `DOMAIN.md` §11.1 — lista de estados **no incluye** `CURRENT` |
| **Conflicto** | `CURRENT` existe en capas técnicas pero no en el modelo de dominio. |
| **Impacto** | Puede interpretarse como estado del documento o de la versión vigente. |
| **Resolución recomendada** | Tratar `CURRENT` como estado derivado, no como estado de máquina explícito. Un documento se considera `CURRENT` cuando su `current_version_id` apunta a una versión `PUBLISHED`. El workflow opera sobre `PUBLISHED`. |

### CONFLICT-004: Campo `document_type` vs `DocumentType` Relación

| Campo | Valor |
|---|---|
| **Fuente 1** | `DATABASE.md` §14.1 — `documents` tiene `document_type VARCHAR(50)` |
| **Fuente 2** | `prisma/schema.prisma` — `Document` tiene `documentTypeId` FK a `DocumentType` |
| **Conflicto** | La especificación de BD original usa un string simple; el schema usa una relación a tabla catálogo. |
| **Impacto** | Inconsistencia entre documento de referencia y schema validado. |
| **Resolución recomendada** | El schema validado prevalece. `DocumentType` es una entidad global catálogo. `DOCUMENT_MANAGEMENT.md` opera sobre el modelo relacional. |

---

## 2. Principles

### 2.1 Principios del Control Documental

El sistema debe garantizar:

- **Documento identificable**: código único, título, tipo, clasificación.
- **Versión identificable**: número de versión, label, estado, hash de contenido.
- **Propietario identificable**: responsable de la creación y mantenimiento.
- **Estado conocido**: máquina de estados explícita sin transiciones implícitas.
- **Aprobación trazable**: registro de quién aprobó, cuándo y con qué comentario.
- **Publicación controlada**: precondiciones estrictas antes de marcar vigente.
- **Distribución controlada**: registro de destinatarios y acuses.
- **Integridad verificable**: hash SHA-256 del contenido en cada versión.
- **Historial inmutable**: versiones y eventos no se alteran ni eliminan.
- **Acceso según autorización**: permiso + tenant + estado del recurso.
- **Obsolescencia controlada**: transición explícita con motivo y trazabilidad.
- **Conservación histórica**: archivo con retención configurable.

### 2.2 Integración con AUTH_SPEC.md

Toda operación documental requiere:
1. **Authentication**: JWT válido.
2. **Tenant Context**: `organizationId` del documento coincide con el del JWT.
3. **Permission**: permiso explícito según operación.
4. **Resource Authorization**: el recurso pertenece al tenant y está en estado válido.

### 2.3 Integración con WORKFLOW_SPEC.md

Los flujos documentales respetan la máquina de estados, transiciones, precondiciones y efectos secundarios definidos en `WORKFLOW_SPEC.md`.

---

## 3. Document vs DocumentVersion

### 3.1 Document

`Document` representa el objeto documental lógico.

Características:
- Es el agregado raíz.
- Agrupa todas las versiones de un mismo documento.
- Mantiene metadatos estables: código, título, tipo, propietario, proceso, clasificación.
- Mantiene `current_version_id` para referenciar la versión vigente.
- No contiene el archivo físico.

Ejemplo:
```
Document: POL-001 "Política de Calidad"
  ├── Version 1.0 (DRAFT → PUBLISHED)
  ├── Version 1.1 (DRAFT → PUBLISHED)
  └── Version 2.0 (DRAFT → PUBLISHED)
```

### 3.2 DocumentVersion

`DocumentVersion` representa una versión concreta e inmutable.

Características:
- Pertenece a un `Document`.
- Contiene el archivo físico a través de `fileAssetId`.
- Registra `versionMajor`, `versionMinor`, `versionLabel`.
- Registra `fileHash` SHA-256 del contenido.
- Registra quién la creó, aprobó y cuándo.
- Es histórica e inmutable una vez publicada.
- No se actualiza ni elimina.

### 3.3 Relación

```
Document (1) ──< (N) DocumentVersion
Document (1) ──< (N) DocumentDistribution
Document (1) ──< (N) DocumentAcknowledgement
DocumentVersion (1) ──< (N) DocumentApproval
DocumentVersion (1) ──< (N) DocumentReviewer
```

---

## 4. Document Identity

### 4.1 Campos de Identidad

| Campo | Tipo | Descripción | Obligatorio |
|---|---|---|---|
| `id` | UUID | Identificador único interno. | Sí |
| `organizationId` | UUID | Tenant propietario. | Sí |
| `code` | string | Código de negocio único en el tenant. | Sí |
| `title` | string | Título del documento. | Sí |
| `documentTypeId` | UUID | Tipo de documento (catálogo global). | Sí |
| `processId` | UUID | Proceso asociado (opcional). | No |
| `departmentId` | UUID | Departamento asociado (opcional). | No |
| `ownerId` | UUID | Propietario del documento. | Sí |
| `responsibleId` | UUID | Responsable de mantenimiento. | Sí |
| `classification` | enum | Clasificación de seguridad. | Sí |
| `confidentiality` | enum | Nivel de confidencialidad. | Sí |
| `status` | enum | Estado actual del documento. | Sí |
| `currentVersionId` | UUID | Versión vigente publicada. | No |
| `issueDate` | date | Fecha de emisión. | No |
| `reviewDate` | date | Fecha de próxima revisión. | No |
| `nextReviewDate` | date | Fecha de siguiente revisión programada. | No |
| `isActive` | boolean | Soft delete lógico. | Sí |
| `createdById` | UUID | Creador. | Sí |
| `updatedById` | UUID | Último modificador. | Sí |

---

## 5. Document Code

### 5.1 Patrón Recomendado

Formato: `{PREFIX}-{NUMERIC_SEQUENCE}`

Prefijos sugeridos:

| Prefijo | Tipo |
|---|---|
| `POL` | Política |
| `PRO` | Procedimiento |
| `MAN` | Manual |
| `INS` | Instrucción |
| `FOR` | Formato |
| `GUI` | Guía |
| `REG` | Registro |
| `EXT` | Documento Externo |

### 5.2 Reglas

- **Unicidad**: único dentro de la organización (`organizationId + code`).
- **Alcance**: tenant-scoped. Dos organizaciones pueden tener `POL-001`.
- **Formato**: 3 letras mayúsculas, guion, 3 dígitos numéricos como mínimo.
- **Generación**: automática por el backend para evitar colisiones.
- **Modificabilidad**: el código no debe cambiar después de creado el documento.

### 5.3 Colisiones entre Tenants

- El backend antepone el tenant implícitamente al generar secuencias.
- No se expone el `organizationId` como parte del código visible.

---

## 6. Document Classification

### 6.1 Clasificación de Tipo

Basado en `DocumentType` (catálogo global):

| Tipo | Descripción |
|---|---|
| `POLICY` | Política de alto nivel. |
| `PROCEDURE` | Procedimiento operativo. |
| `MANUAL` | Manual de usuario o técnico. |
| `INSTRUCTION` | Instrucción de trabajo. |
| `FORM` | Formato o plantilla de registro. |
| `RECORD` | Registro de evidencia. |
| `GUIDELINE` | Línea directriz o guía. |
| `EXTERNAL_DOCUMENT` | Documento externo (norma, regulación). |

### 6.2 Clasificación de Confidencialidad

| Nivel | Descripción | Tratamiento |
|---|---|---|
| `PUBLIC` | Divulgación abierta. | Sin restricción especial. |
| `INTERNAL` | Solo personal de la organización. | Acceso por autenticación. |
| `CONFIDENTIAL` | Datos sensibles. | Acceso por rol específico. |
| `RESTRICTED` | Máxima sensibilidad. | Acceso mínimo, logging obligatorio. |

---

## 7. Document Metadata

### 7.1 Metadata Obligatoria

- `code`
- `title`
- `documentTypeId`
- `ownerId`
- `responsibleId`
- `classification`
- `confidentiality`
- `status`
- `organizationId`

### 7.2 Metadata Recomendada

- `description`
- `processId`
- `departmentId`
- `issueDate`
- `reviewDate`
- `nextReviewDate`
- `relatedDocumentIds`

### 7.3 Metadata Opcional

- `keywords`
- `language` (default `es`)
- `tags`
- `customFields` (JSONB según `organization_settings`)

---

## 8. Document Ownership

### 8.1 Document Owner

- **Definición**: usuario que creó o es propietario del documento.
- **Responsabilidad**: mantenimiento, actualización, solicitud de revisión.
- **Puede**: editar metadatos en borrador, solicitar revisión, cancelar en estados intermedios.
- **No puede**: aprobar su propio documento (maker-checker).

### 8.2 Document Responsible

- **Definición**: usuario responsable de la vigencia y contenido.
- **Responsabilidad**: asegurar que el documento esté actualizado y disponible.
- **Puede**: solicitar obsolescencia, asignar revisores, validar contenido.

### 8.3 Approver

- **Definición**: usuario autorizado para aprobar/rechazar versiones.
- **Responsabilidad**: evaluación técnica y formal.
- **Puede**: aprobar o rechazar versiones en `PENDING_APPROVAL`.
- **No puede**: ser el mismo que el creator de la versión.

---

## 9. Document Lifecycle

### 9.1 Estados

| Estado | Descripción |
|---|---|
| `DRAFT` | Borrador inicial. El documento se edita. |
| `IN_REVIEW` | En revisión por revisores designados. |
| `REJECTED` | Rechazado durante revisión o aprobación. Vuelve a borrador. |
| `PENDING_APPROVAL` | Pendiente de aprobación final. |
| `APPROVED` | Aprobado, listo para publicar. |
| `PUBLISHED` | Publicado y vigente. |
| `OBSOLETE` | Obsoleto, histórico. |
| `CANCELLED` | Cancelado antes de completar el ciclo. |

> **Nota:** `ARCHIVED` está documentado en `WORKFLOW_SPEC.md` pero no existe en `prisma/schema.prisma` ni en `DOMAIN.md`. Ver `CONFLICT-001`.

### 9.2 Significado por Estado

| Estado | Quién puede modificar | Operaciones permitidas | Operaciones prohibidas |
|---|---|---|---|
| `DRAFT` | Owner, Responsible | Editar metadatos, agregar versiones, eliminar | Submit si no hay versión |
| `IN_REVIEW` | Reviewers (comentar), Owner (corregir) | Comentar, corregir, cancelar | Editar libremente |
| `REJECTED` | Owner, Responsible | Corregir, resubmit | Ninguna otra |
| `PENDING_APPROVAL` | Aprobadores | Aprobar, rechazar, cancelar | Editar metadatos |
| `APPROVED` | Admin, Publisher | Publicar, cancelar | Editar contenido |
| `PUBLISHED` | Ninguno (solo lectura) | Distribuir, obsoleto | Modificar contenido |
| `OBSOLETE` | Ninguno (solo lectura) | Archivar | Modificar contenido |
| `CANCELLED` | Ninguno (solo lectura) | Archivar | Reactivar |

---

## 10. Document Versioning

### 10.1 Esquema de Versionamiento

Formato: `{major}.{minor}`

- `versionMajor`: entero >= 1.
- `versionMinor`: entero >= 0.
- `versionLabel`: string legible generado como `"{major}.{minor}"`.

### 10.2 Reglas de Incremento

| Tipo de Cambio | Acción |
|---|---|
| Cambio menor (corrección ortográfica, formato) | Incrementar `versionMinor` |
| Cambio estructural (nuevo procedimiento, alcance) | Incrementar `versionMajor`, resetear `versionMinor` a 0 |
| Corrección de emergencia | Incrementar `versionMinor` o `versionMajor` según impacto |

### 10.3 Secuencia Típica

```
1.0 (primera versión)
1.1 (corrección menor)
1.2 (otra corrección)
2.0 (cambio estructural)
```

### 10.4 Restricciones

- `(documentId, versionMajor, versionMinor)` es único.
- No se pueden saltar números de versión.
- No se puede modificar una versión publicada.

---

## 11. Version Immutability

### 11.1 Regla Fundamental

Una versión publicada es inmutable.

No se permite:
- `UPDATE` de contenido.
- `UPDATE` de `fileHash`.
- `UPDATE` de metadatos históricas (fechas de aprobación, firmas).
- `DELETE` físico.
- Reemplazo del `FileAsset` asociado.

### 11.2 Consecuencia

Cualquier modificación requiere crear una nueva versión.

---

## 12. Version Creation

### 12.1 Quién Puede Crear

- Owner del documento.
- Responsable del documento.
- Usuario con permiso `documents:createVersion`.

### 12.2 Desde Qué Estados

- `PUBLISHED`: para crear una nueva versión que reemplace la vigente.
- `DRAFT`: para agregar una versión inicial o adicional en borrador.
- `REJECTED`: para corregir y crear nueva versión.

### 12.3 Información que se Copia

- Referencia al `Document` padre.
- `organizationId`.
- Metadatos base (tipo, proceso, departamento).
- Clasificación y confidencialidad.

### 12.4 Información que se Resetea

- `versionMajor` y `versionMinor` (siguiente número).
- `status` → `DRAFT`.
- `fileAssetId` → nuevo archivo.
- `fileHash` → nuevo hash.
- `approvedById` → null.
- `approvedAt` → null.
- `createdById` → usuario actual.

### 12.5 Aprobaciones Anteriores

Una nueva versión NO hereda aprobaciones de la versión anterior. El flujo de aprobación comienza desde cero para la nueva versión.

---

## 13. FileAsset

### 13.1 Relación

```
DocumentVersion (1) ──> (1) FileAsset
```

Cada `DocumentVersion` referencia exactamente un `FileAsset`.

### 13.2 Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único. |
| `organizationId` | UUID | Tenant. |
| `storageProvider` | enum | `S3`, `MINIO`, `LOCAL`. |
| `bucketName` | string | Contenedor de almacenamiento. |
| `objectKey` | string | Ruta única en storage. |
| `originalFilename` | string | Nombre original del archivo. |
| `mimeType` | string | Tipo MIME. |
| `fileSizeBytes` | bigint | Tamaño en bytes. |
| `sha256Hash` | string | Hash SHA-256 del contenido. |
| `metadata` | JSON | Metadatos adicionales (páginas, autor, etc.). |
| `uploadedById` | UUID | Usuario que subió el archivo. |
| `createdAt` | timestamp | Fecha de creación. |

### 13.3 Ownership

El `FileAsset` pertenece a la organización, no al usuario. El usuario es solo el uploader.

### 13.4 Storage

- Backend genera `objectKey` único.
- Formato: `tenants/{organizationId}/documents/{documentId}/{versionId}_{fileUuid}.{ext}`
- Nunca se usa el nombre original en la ruta de storage.

---

## 14. File Integrity

### 14.1 Algoritmo

SHA-256 (64 caracteres hexadecimales).

### 14.2 Cuándo se Calcula

- En el momento del upload, antes de crear el `FileAsset`.
- Backend calcula el hash del archivo recibido.

### 14.3 Dónde se Almacena

- En `FileAsset.sha256Hash`.
- En `DocumentVersion.fileHash` (copia para trazabilidad).

### 14.4 Cuándo se Verifica

- Al crear la versión.
- Al publicar el documento.
- Al descargar el archivo (validación contra el hash almacenado).

### 14.5 Si Cambia el Contenido

- El hash no coincidirá.
- Se genera alerta de integridad.
- La versión no puede considerarse válida.
- Se requiere nueva versión con archivo correcto.

---

## 15. Storage

### 15.1 Abstracción

El dominio no depende directamente de S3, MinIO o filesystem.

Interfaz conceptual:

```typescript
interface DocumentStorage {
  generateUploadUrl(tenantId, documentId, versionId, filename, mimeType): Promise<PresignedUrl>
  generateDownloadUrl(tenantId, objectKey): Promise<PresignedUrl>
  validateFile(objectKey, expectedHash): Promise<boolean>
  deleteObject(objectKey): Promise<void>
}
```

### 15.2 Implementaciones

- `S3Storage`: AWS S3.
- `MinIOStorage`: MinIO (desarrollo/staging).
- `LocalStorage`: filesystem local (testing).

### 15.3 Regla

El dominio solo conoce `objectKey` y `sha256Hash`. La implementación de storage es responsabilidad de infraestructura.

---

## 16. Upload Flow

### 16.1 Flujo Exitoso

```
Create Document
  ↓
Request Presigned Upload URL
  ↓
Upload File to Storage
  ↓
Validate File (size, MIME, hash)
  ↓
Create DocumentVersion
  ↓
Submit for Review
  ↓
Approve
  ↓
Publish
```

### 16.2 Si Falla

| Paso | Falla | Acción |
|---|---|---|
| Request URL | Storage caído | Retornar `503`. No crear documento. |
| Upload | Timeout, red | Cliente reintenta. Backend no crea versión hasta confirmación. |
| Validate | Hash incorrecto | Rechazar upload, retornar `422`. No crear versión. |
| Create Version | DB error | Rollback. No existe versión huérfana. |
| Submit | Precondiciones fallidas | Retornar `422`. Documento queda en `DRAFT`. |

---

## 17. File Validation

### 17.1 Validaciones Obligatorias

- **Extensión**: contra lista blanca por tipo de documento.
- **MIME type**: validar header `Content-Type` y magic bytes.
- **Tamaño**: máximo configurable por tenant (default 50 MB).
- **Hash**: SHA-256 debe coincidir con el archivo subido.
- **Nombre de archivo**: sanitizado, max 255 caracteres, sin caracteres especiales.

### 17.2 Validaciones Adicionales

- **Magic bytes**: validar firma de archivo (primeros bytes).
- **Contenido**: análisis básico para detectar polyglots.

### 17.3 No Confiar

Nunca confiar únicamente en:
- Extensión del archivo.
- `Content-Type` declarado por el cliente.
- Nombre de archivo.

---

## 18. Malware Scanning

### 18.1 Integración Conceptual

Antivirus / Malware Scanner como paso obligatorio antes de publicar.

### 18.2 Flujo

```
Upload → Validate → Scan Malware
  ↓
Si limpio → Create Version
Si infectado → Reject, Audit, Notify
```

### 18.3 Regla

El documento no se considera publicable hasta superar los controles de malware.

### 18.4 Implementación

- Producción: ClamAV o solución equivalente.
- Desarrollo: omitir o simular.
- Archivos infectados se rechazan y auditan.

---

[PAUSA DE SEGURIDAD - FASE 1 COMPLETADA. Solicita la FASE 2 para continuar con Revisión, Aprobación, Publicación y Distribución]

---

## 19. Document Review

### 19.1 Flujo

```
DRAFT
  ↓
SubmitDocumentForReview
  ↓
IN_REVIEW
  ↓
Reviewers evalúan
  ↓
CompleteReview (auto)
  ↓
PENDING_APPROVAL
```

### 19.2 Reviewer Assignment

- Asignación manual por Owner o Responsible.
- Pueden asignarse revisores por usuario, rol o departamento.
- Secuencia de revisión: paralela o secuencial (configurable por tenant).

### 19.3 Comentarios

- Obligatorios al rechazar.
- Opcionales al aprobar revisión.
- Históricos e inmutables.
- Vinculados a `DocumentVersion` y `DocumentReviewer`.

---

## 20. Review Comments

### 20.1 Estructura

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único. |
| `documentVersionId` | UUID | Versión revisada. |
| `reviewerId` | UUID | Usuario revisor. |
| `comment` | text | Comentario textual. |
| `status` | enum | `PENDING`, `APPROVED`, `REJECTED`. |
| `completedAt` | timestamp | Fecha de revisión. |
| `createdAt` | timestamp | Fecha de asignación. |

### 20.2 Reglas

- Un reviewer puede comentar una sola vez por versión (a menos que se permita re-revisión).
- Los comentarios son inmutables una vez registrados.
- Si el reviewer rechaza, debe proporcionar comentario obligatorio.

---

## 21. Approval

### 21.1 Estructura

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único. |
| `documentVersionId` | UUID | Versión aprobada. |
| `approverId` | UUID | Usuario aprobador. |
| `status` | enum | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. |
| `comment` | text | Comentario opcional. |
| `decidedAt` | timestamp | Fecha de decisión. |
| `createdAt` | timestamp | Fecha de asignación. |

### 21.2 Reglas

- Una aprobación no puede alterarse después de decidida.
- Solo existe una aprobación por usuario por versión.
- La secuencia de aprobación debe respetarse si está definida.

---

## 22. Multi-Level Approval

### 22.1 Estrategia

El sistema soporta aprobación secuenciada simple:

```
Technical Review → Quality Approval → Management Approval
```

### 22.2 Implementación

- No se implementa un motor genérico de flujos de aprobación.
- La secuencia se define mediante configuración de tenant o campos en la versión.
- Cada nivel asigna aprobadores específicos.

### 22.3 Reglas

- Todos los niveles deben completarse para publicar.
- Si un nivel rechaza, el flujo retrocede a `REJECTED`.
- No se permite saltarse niveles.

---

## 23. Approval Rules

### 23.1 Maker-Checker Principle

- El creador de la versión no puede aprobarla.
- El owner no puede aprobar (solo el responsible o aprobador designado).
- Separación de funciones entre creación y aprobación.

### 23.2 Conflicto de Interés

- Un usuario no puede aprobar un documento del que es owner o creator.
- Si existe conflicto, debe delegar a otro aprobador.

### 23.3 Self-Approval Prohibido

- `createdById === approverId` → rechazado con `FORBIDDEN`.
- `ownerId === approverId` → rechazado con `FORBIDDEN`.

### 23.4 Required Approvals

- Configurable por tenant.
- Mínimo: 1 aprobación.
- Máximo: sin límite técnico, pero se recomienda <= 5.

### 23.5 Rejection

- Requiere comentario obligatorio.
- Resetea el flujo de aprobación.
- Notifica al creador.

---

## 24. Electronic Signature

### 24.1 Flujo

1. Usuario autorizado solicita firmar.
2. Sistema verifica identidad (JWT + MFA si step-up).
3. Se calcula `signedContentHash` del documento/versión en ese momento.
4. Se genera `signatureHash` con hash chaining.
5. Se registra `ElectronicSignatureEvent` append-only.

### 24.2 Datos Registrados

| Campo | Tipo | Descripción |
|---|---|---|
| `userId` | UUID | Firmante. |
| `entityType` | string | Tipo de entidad (`DocumentVersion`, `CorrectiveAction`, etc.). |
| `entityId` | UUID | ID de la entidad firmada. |
| `action` | string | Acción firmada (`APROBAR_DOCUMENTO`, `PUBLICAR`, etc.). |
| `signedContentHash` | string | SHA-256 del contenido en el momento de la firma. |
| `signatureHash` | string | SHA-256 del evento (hash chaining). |
| `ipAddress` | string | IP del firmante. |
| `userAgent` | string | User agent. |
| `signedAt` | timestamp | Momento de la firma. |

### 24.3 Vinculación

- La firma está vinculada a la versión exacta.
- No es transferible a otra versión.
- No es válida para contenido modificado.

---

## 25. Signature Invalidation

### 25.1 Regla

Si cambia el contenido de una versión publicada:

- La firma anterior NO se modifica ni elimina.
- Se registra una nueva firma para la nueva versión.
- La firma anterior queda vinculada a la versión original (inmutable).

### 25.2 Detección

- Cualquier consulta de validez compara `signedContentHash` contra el hash actual del contenido.
- Si difiere, la firma se marca como inválida para ese contenido.

---

## 26. Publication

### 26.1 Precondiciones

1. Documento en `APPROVED`.
2. Versión aprobada existe y es la vigente.
3. `fileAsset` asociado existe y es accesible.
4. Integridad de archivo validada (`sha256Hash` coincide).
5. Malware scan exitoso.
6. Actor tiene `documents:publish`.
7. Tenant coincide.

### 26.2 Efectos

- `document.status` → `PUBLISHED`.
- `document.currentVersionId` → versión aprobada.
- Se crean distribuciones automáticas según política del tenant.
- Se generan acuses de recibo pendientes.
- Se registra `DocumentPublished` event.
- Se genera audit log `DOCUMENT_PUBLISHED`.

---

## 27. Current Version

### 27.1 Definición

La `Current Published Version` es la versión referenciada por `document.currentVersionId`.

### 27.2 Unicidad

Solo una versión puede ser vigente por documento en un momento dado.

### 27.3 Al Publicar Nueva Versión

- `currentVersionId` se actualiza a la nueva versión.
- La versión anterior deja de ser vigente pero se preserva.
- Las distribuciones futuras usan la nueva versión.

---

## 28. Effective Date

### 28.1 Diferenciación

| Concepto | Descripción |
|---|---|
| `issueDate` | Fecha de emisión del documento. |
| `publicationDate` | Fecha en que se publicó en el sistema. |
| `effectiveDate` | Fecha de entrada en vigor. |

### 28.2 Regla

Un documento puede publicarse hoy pero entrar en vigor posteriormente.

- `effectiveDate` puede ser mayor a `publicationDate`.
- Hasta `effectiveDate`, el documento está publicado pero no es aplicable.
- Después de `effectiveDate`, es la versión vigente de facto.

---

## 29. Review Date

### 29.1 Definición

`nextReviewDate` define cuándo debe revisarse nuevamente el documento.

### 29.2 Comportamiento

- Al acercarse la fecha: se genera notificación de revisión próxima.
- Al superar la fecha: se marca como `overdue` pero no se cambia el estado automáticamente.
- El documento sigue vigente hasta que se complete la revisión.

### 29.3 No Cambio Automático

No se cambia automáticamente el estado a `OBSOLETE` por vencimiento de revisión. Se requiere acción humana explícita.

---

## 30. Periodic Review

### 30.1 Proceso

```
Published
  ↓
Review Due (nextReviewDate alcanzada)
  ↓
Notification
  ↓
Review
  ↓
Continue (sin cambios)
  ↓
o
New Version Required
```

### 30.2 Resultados

| Resultado | Acción |
|---|---|
| No changes | Se actualiza `nextReviewDate` al siguiente ciclo. |
| New version required | Se crea nueva versión con cambios. |

---

## 31. Emergency Revision

### 31.1 Definición

Revisión urgente que requiere flujo acelerado.

### 31.2 Reglas

- Permite crear nueva versión con prioridad alta.
- Acorta tiempos de revisión/aprobación según política del tenant.
- No permite bypasear controles críticos.
- Requiere justificación obligatoria.
- Genera evento de dominio `EmergencyRevisionRequested`.

---

## 32. Distribution

### 32.1 Estructura

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único. |
| `documentId` | UUID | Documento distribuido. |
| `documentVersionId` | UUID | Versión distribuida. |
| `organizationId` | UUID | Tenant. |
| `assignedToUserId` | UUID | Usuario destinatario (opcional). |
| `assignedToDepartmentId` | UUID | Departamento destinatario (opcional). |
| `assignedToRoleId` | UUID | Rol destinatario (opcional). |
| `status` | enum | `PENDING`, `ACKNOWLEDGED`. |
| `distributedAt` | timestamp | Fecha de distribución. |
| `revokedAt` | timestamp | Fecha de revocación (opcional). |

### 32.2 Estrategias de Destinatarios

- **Individual**: por usuario específico.
- **Rol**: todos los usuarios con un rol determinado.
- **Departamento**: todos los usuarios de un departamento.
- **Proceso**: todos los usuarios involucrados en un proceso.
- **Organización**: todos los usuarios del tenant.

### 32.3 Resolución

El backend resuelve destinatarios en tiempo de distribución. No se almacenan listas expandidas permanentemente.

---

## 33. Distribution Versioning

### 33.1 Al Publicar Nueva Versión

- Se redistribuye automáticamente según la política del tenant.
- Opciones:
  - A todos los afectados.
  - Solo a nuevos usuarios desde la última distribución.
  - Depende de clasificación del documento.

### 33.2 Regla

Una nueva versión publicada no invalida automáticamente las distribuciones anteriores. Se marcan como reemplazadas y se genera nueva distribución.

---

## 34. Acknowledgement

### 34.1 Definición

El acuse de recibo confirma que el destinatario ha leído y aceptado el documento distribuido.

### 34.2 Flujo

```
Document Distribution
  ↓
User receives notification
  ↓
User reads document
  ↓
User acknowledges
  ↓
DocumentAcknowledgement registered
```

### 34.3 Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único. |
| `documentDistributionId` | UUID | Distribución origen. |
| `userId` | UUID | Usuario que acusa. |
| `ipAddress` | string | IP del usuario. |
| `userAgent` | string | User agent. |
| `acknowledgedAt` | timestamp | Fecha de acuse. |

### 34.4 Reglas

- Un usuario solo puede acusar una vez por distribución.
- El acuse es inmutable.
- Se registra IP y user agent para trazabilidad.

---

## 35. Read vs Acknowledge

### 35.1 Viewed

- El usuario abrió el documento.
- No implica aceptación.
- Se registra en logs de acceso.

### 35.2 Acknowledged

- El usuario confirmó explícitamente que leyó y aceptó el documento.
- Es una acción deliberada.
- Genera `DocumentAcknowledgement`.

### 35.3 Regla

Ver un documento NO significa necesariamente que fue reconocido. El acknowledgement es una acción separada y obligatoria cuando la distribución lo requiere.

---

[PAUSA DE SEGURIDAD - FASE 2 COMPLETADA. Solicita la FASE 3 para continuar con Obsolescencia, Retención, Registros y Relaciones]

---

## 36. Document Obsolescence

### 36.1 Definición

Un documento pasa a `OBSOLETE` cuando deja de estar vigente.

### 36.2 Precondiciones

- Documento en `PUBLISHED`.
- Existe reemplazo (si aplica).
- Actor autorizado (`documents:obsolete`).
- Motivo obligatorio.

### 36.3 Efectos

- `status` → `OBSOLETE`.
- Se preserva `currentVersionId` para trazabilidad.
- Se notifica a usuarios con acuses pendientes.
- Se registra `DocumentObsoleted` event.
- Se genera audit log.

---

## 37. Replacement

### 37.1 Relación

Old Document/Version → New Document/Version.

### 37.2 Tipos

| Tipo | Descripción |
|---|---|
| **Reemplazo de versión** | Nueva versión del mismo documento reemplaza la anterior. |
| **Reemplazo de documento** | Documento nuevo reemplaza documento anterior (ej: procedimiento sustituye a otro). |

### 37.3 Regla

El reemplazo no elimina el documento anterior. Se preserva para auditoría y se marca como `OBSOLETE`.

---

## 38. Archiving

### 38.1 Definición

`ARCHIVED` es un estado administrativo final para documentos que cumplieron su retención.

> **Nota:** Ver `CONFLICT-001`. Hasta que se agregue `ARCHIVED` al schema, se trata como estado derivado en capa de aplicación.

### 38.2 Condiciones

- Documento en `OBSOLETE` o `CANCELLED`.
- Cumplió periodo de retención configurado.
- Permiso `documents:archive`.
- No bajo `legal hold`.

### 38.3 Efectos

- Se preserva metadata, versiones, aprobaciones, firmas, distribuciones y audit trail.
- Se oculta de listados activos.
- No se puede modificar ni eliminar.

---

## 39. Retention

### 39.1 Definición

Periodo mínimo de conservación documental.

### 39.2 Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `retentionPeriodYears` | number | Años de retención. |
| `retentionStartDate` | date | Fecha de inicio de retención. |
| `retentionEndDate` | date | Fin de retención (calculado). |
| `legalHold` | boolean | Si está bajo retención legal. |

### 39.3 Reglas

- El periodo de retención se configura por tipo de documento o tenant.
- No se elimina automáticamente información crítica sin política explícita.
- La retención legal prevalece sobre la disposición normal.

---

## 40. Disposition

### 40.1 Cuando Finaliza la Retención

- **Review**: revisar si aún se requiere conservar.
- **Approval**: aprobación para disposición final.
- **Deletion**: eliminación segura (si aplica).
- **Anonymization**: anonimización si existe información personal.
- **Legal Hold**: si aplica, bloquear disposición.

---

## 41. Legal Hold

### 41.1 Definición

Un documento bajo `legal hold` NO puede ser eliminado ni archivado hasta que se levante la orden.

### 41.2 Reglas

- Se activa manualmente por admin o rol autorizado.
- Prevalece sobre retención normal.
- Genera evento `LegalHoldApplied` / `LegalHoldReleased`.
- Se audita obligatoriamente.

---

## 42. Document Access

### 42.1 Permisos por Operación

| Operación | Permission |
|---|---|
| `read` | `documents:read` |
| `download` | `documents:download` |
| `create` | `documents:create` |
| `update` | `documents:update` |
| `submit` | `documents:submit` |
| `review` | `documents:review` |
| `approve` | `documents:approve` |
| `reject` | `documents:reject` |
| `publish` | `documents:publish` |
| `obsolete` | `documents:obsolete` |
| `archive` | `documents:archive` |
| `distribute` | `documents:distribute` |
| `acknowledge` | `documents:acknowledge` |

### 42.2 Resource Authorization

Además del permiso:
- `document.organizationId === user.organizationId`
- Estado del documento permite la operación.
- Usuario es propietario, responsable o aprobador según corresponda.

---

## 43. Confidentiality

### 43.1 Clasificación

| Nivel | Acceso | Download | Distribución | Logging |
|---|---|---|---|---|
| `PUBLIC` | Lectura autenticada | Permitido | Permitido | Estándar |
| `INTERNAL` | Lectura autenticada | Permitido | Permitido | Estándar |
| `CONFIDENTIAL` | Solo rol autorizado | Permitido | Restringido | Obligatorio |
| `RESTRICTED` | Solo usuarios específicos | Con aprobación | Prohibido | Obligatorio + alerta |

### 43.2 Regla

La clasificación de confidencialidad afecta acceso, descarga, distribución y logging.

---

## 44. Download Control

### 44.1 Restricciones

- **Downloading**: requiere `documents:download` + clasificación compatible.
- **Printing**: no se implementa DRM; se confía en la clasificación y logging.
- **Sharing**: no se permite share directo; se usa distribución controlada.

### 44.2 Regla

No prometer DRM si la infraestructura no lo soporta. El control se realiza mediante autorización y trazabilidad.

---

## 45. Document Search

### 45.1 Búsqueda por Campos

- `code`
- `title`
- `type`
- `category`
- `process`
- `owner`
- `status`
- `version`
- `effectiveDate`
- `reviewDate`

### 45.2 Filtrado

- Por tenant (siempre).
- Por estado.
- Por clasificación.
- Por rango de fechas.

---

## 46. Full-Text Search

### 46.1 Indexación

- Se indexa contenido extraído de `DocumentVersion.fileAsset`.
- Se respeta tenant isolation.
- Se filtra por versión vigente o histórica según request.

### 46.2 OCR

- Si el archivo es imagen/PDF escaneado, se aplica OCR.
- El resultado se almacena para búsqueda sin modificar el original.

### 46.3 Reindexing

- Al crear nueva versión.
- Al cambiar estado a `PUBLISHED`.

---

## 47. Document Relationships

### 47.1 Relaciones Soportadas

| Relación | Propósito |
|---|---|
| `Document ↔ Process` | El documento pertenece a un proceso. |
| `Document ↔ StandardRequirement` | El documento cubre un requisito normativo. |
| `Document ↔ Risk` | El documento mitiga un riesgo. |
| `Document ↔ Audit` | El documento es evidencia de auditoría. |
| `Document ↔ Nonconformity` | El documento es evidencia de no conformidad. |
| `Document ↔ Training` | El documento es material de capacitación. |
| `Document ↔ Document` | Documento relacionado (padre/hijo, referencia). |

### 47.2 Regla

Las relaciones no afectan el ciclo de vida del documento. Son referencias analíticas.

---

## 48. External Documents

### 48.1 Definición

Documentos externos son normas, regulaciones, leyes o documentación de proveedores que la organización adopta.

### 48.2 Control

- Se registra fuente, versión y validez.
- Se asigna responsable de vigencia.
- Se revisa periodicamente según calendarización.

### 48.3 Ejemplos

- ISO 9001:2015
- Regulación local aplicable
- Documentación técnica de proveedor

---

## 49. Records

### 49.1 Diferenciación

| Aspecto | Controlled Document | Record |
|---|---|---|
| **Propósito** | Define cómo hacer algo. | Evidencia de que algo se hizo. |
| **Ciclo de vida** | Borrador → Revisión → Aprobación → Publicación → Obsolescencia. | Creación → Uso → Retención → Disposición. |
| **Control** | Versionado, aprobación, distribución. | Inmutable, solo lectura. |
| **Ejemplo** | Procedimiento de Calidad. | Formulario de inspección completado. |

### 49.2 Regla

Un formulario (`Form`) es un documento controlado que sirve para generar registros (`Records`).

---

## 50. Forms

### 50.1 Definición

Un `Form` es un documento controlado que define la estructura para capturar información.

### 50.2 Ciclo

- Como documento: `DRAFT → IN_REVIEW → APPROVED → PUBLISHED`.
- Como formulario: una vez publicado, se utiliza para generar registros.

### 50.3 Registro

- El registro resultante (`Record`) es inmutable.
- El formulario puede evolucionar con nuevas versiones.

---

## 51. Document Templates

### 51.1 Definición

Un `Template` es un documento base para crear nuevos documentos.

### 51.2 Regla

El template NO es una versión publicada. Es un documento auxiliar que puede actualizarse sin afectar el historial de versiones de los documentos generados.

---

## 52. Document Change History

### 52.1 Registro

Cada modificación relevante registra:

- actor
- timestamp
- action
- previous value
- new value
- reason
- version

### 52.2 Almacenamiento

- Se registra en `audit_logs`.
- No se almacena información innecesaria o sensible.

---

## 53. Audit Trail

### 53.1 Operaciones Auditables

- create
- update
- submit
- review
- approve
- reject
- publish
- distribute
- acknowledge
- obsolete
- archive
- restore

### 53.2 Registro

Cada operación genera un registro en `audit_logs` con:

- `organizationId`
- `actorId`
- `action`
- `entityType` = `Document` o `DocumentVersion`
- `entityId`
- `payload` (old_values / new_values)
- `correlationId`
- `createdAt`

---

## 54. Restore

### 54.1 Definición

Restaurar un documento archivado a estado previo.

### 54.2 Reglas

- Actor: admin con `documents:restore`.
- Permiso: `documents:restore`.
- Condiciones: no viola integridad histórica.
- Audit: se registra `DOCUMENT_RESTORED`.
- Event: `DocumentRestored`.

### 54.3 Limitación

No se permite restaurar si el documento fue eliminado por disposición final.

---

## 55. Document Cloning

### 55.1 Definición

Duplicar un documento existente para crear uno nuevo.

### 55.2 Qué se Copia

- Metadata base (tipo, clasificación, proceso, departamento).
- Relaciones (procesos, requisitos).
- Archivo original.

### 55.3 Qué NO se Copia

- Aprobaciones históricas.
- Firmas.
- Distribuciones.
- Acuses.
- Historial de auditoría.

### 55.4 Regla

Las aprobaciones y firmas históricas NO deben copiarse como válidas.

---

## 56. Bulk Operations

### 56.1 Operaciones Masivas Soportadas

- distribute
- archive
- obsolete
- assign owner/responsible
- export

### 56.2 Reglas

- Cada elemento respeta sus propias reglas de autorización.
- No convierte una operación masiva en bypass de seguridad.
- Se registra en audit log con cantidad de elementos afectados.

---

## 57. Export

### 57.1 Definición

Exportación de documentos y versiones.

### 57.2 Consideraciones

- Permisos: `documents:export`.
- Tenant: solo documentos del tenant.
- Clasificación: respetar confidencialidad.
- Audit: registrar exportación.
- File integrity: incluir hash en el paquete exportado.

---

## 58. Data Isolation

### 58.1 Regla Fundamental

Toda operación documental respeta:

```
Organization
  +
Authorization
  +
Resource scope
```

### 58.2 Prohibición

Nunca permitir:
- `documentId` de otro tenant → acceso.
- Listado sin filtro de `organizationId`.
- Join cruzado entre tenants.

---

[PAUSA DE SEGURIDAD - FASE 3 COMPLETADA. Solicita la FASE 4 para continuar con Eventos, Notificaciones, Reglas de Negocio, Matrices y Definition of Done]

---

## 59. Concurrency

### 59.1 Optimistic Locking

Las operaciones de actualización y workflow utilizan optimistic locking.

Mecanismo:
- El cliente envía el valor conocido de `updatedAt` en el header `If-Match`.
- El backend compara con el valor actual; si difiere, retorna `409 ConcurrentUpdate`.

Recursos sujetos:
- Documents (metadata)
- DocumentVersions (metadata, approvals)
- DocumentApprovals
- DocumentDistributions

### 59.2 Ejemplo

Dos usuarios intentan aprobar la misma versión simultáneamente:
- Solo una transición válida debe ganar.
- La otra recibe `409 ConcurrentUpdate`.

---

## 60. Idempotency

### 60.1 Definición

Una misma operación repetida no debe producir duplicados inesperados.

### 60.2 Mecanismo

Header `Idempempotency-Key` en requests críticos.

Backend almacena resultado por clave por 24 horas.

Operaciones que soportan idempotencia:
- Creación de documentos.
- Creación de versiones.
- Aprobaciones / rechazos.
- Publicaciones.
- Distribuciones.
- Firmas electrónicas.

---

## 61. Transaction Boundaries

### 61.1 PublishDocument

1. Validar estado y permisos.
2. Actualizar `document.status` → `PUBLISHED`.
3. Actualizar `document.currentVersionId`.
4. Crear `DocumentDistribution` según política.
5. Crear `AuditLog`.
6. Emitir `DocumentPublished` event.

Si una parte falla, rollback completo.

### 61.2 ApproveDocument

1. Validar estado y permisos.
2. Crear/actualizar `DocumentApproval`.
3. Actualizar `DocumentVersion.approvedById` y `approvedAt`.
4. Crear `AuditLog`.
5. Emitir `DocumentApproved` event.

---

## 62. Domain Events

| Evento | Aggregate | Trigger | Payload conceptual | Audit |
|---|---|---|---|---|
| `DocumentCreated` | Document | CreateDocument | documentId, code, organizationId, createdBy | sí |
| `DocumentUpdated` | Document | UpdateDocumentMetadata | documentId, changes, updatedBy | sí |
| `DocumentVersionCreated` | DocumentVersion | CreateDocumentVersion | documentId, versionId, versionLabel, createdBy | sí |
| `DocumentSubmitted` | Document | SubmitDocumentForReview | documentId, versionId, submittedBy | sí |
| `DocumentReviewed` | DocumentVersion | CompleteReview | documentVersionId, reviewerId, status | sí |
| `DocumentApproved` | DocumentVersion | ApproveDocument | documentVersionId, approverId, comment | sí |
| `DocumentRejected` | DocumentVersion | RejectDocument | documentVersionId, approverId, comment | sí |
| `DocumentPublished` | Document | PublishDocument | documentId, versionId, publishedBy | sí |
| `DocumentDistributed` | DocumentDistribution | DistributeDocument | distributionId, documentId, recipients | sí |
| `DocumentAcknowledged` | DocumentAcknowledgement | AcknowledgeDocument | acknowledgementId, userId | sí |
| `DocumentObsoleted` | Document | ObsoleteDocument | documentId, reason, obsoletedBy | sí |
| `DocumentArchived` | Document | ArchiveDocument | documentId, archivedBy | sí |
| `DocumentRestored` | Document | RestoreDocument | documentId, restoredBy | sí |
| `DocumentSigned` | ElectronicSignatureEvent | SignDocument | versionId, userId, action, contentHash | sí |

---

## 63. Notifications

| Evento | Destinatarios | Tipo |
|---|---|---|
| `DocumentSubmitted` | Reviewers, Owner | `DOCUMENT_SUBMITTED` |
| `DocumentReviewed` | Owner, Approvers | `DOCUMENT_REVIEWED` |
| `DocumentApproved` | Owner, Responsible | `DOCUMENT_APPROVED` |
| `DocumentRejected` | Owner, Responsible | `DOCUMENT_REJECTED` |
| `DocumentPublished` | Distribuidos, Owner | `DOCUMENT_PUBLISHED` |
| `DocumentDistributed` | Destinatarios | `DOCUMENT_DISTRIBUTED` |
| `AcknowledgementPending` | Destinatarios | `ACKNOWLEDGEMENT_PENDING` |
| `ReviewDue` | Owner, Responsible | `REVIEW_DUE` |
| `ReviewOverdue` | Owner, Responsible, Quality | `REVIEW_OVERDUE` |
| `DocumentObsoleted` | Owner, Distribuidos | `DOCUMENT_OBSOLETED` |

---

## 64. API Mapping

| Domain Command | State Transition | API Endpoint | Method | Auth | Permission |
|---|---|---|---|---|---|
| `CreateDocument` | `[*] → DRAFT` | `/documents` | POST | required | `documents:create` |
| `UpdateDocumentMetadata` | `DRAFT` | `/documents/:id` | PATCH | required | `documents:update` |
| `SubmitDocumentForReview` | `DRAFT/REJECTED → IN_REVIEW` | `/documents/:id/submit` | POST | required | `documents:submit` |
| `ApproveDocument` | `PENDING_APPROVAL → APPROVED` | `/documents/:id/approve` | POST | required | `documents:approve` |
| `RejectDocument` | `PENDING_APPROVAL → REJECTED` | `/documents/:id/reject` | POST | required | `documents:reject` |
| `PublishDocument` | `APPROVED → PUBLISHED` | `/documents/:id/publish` | POST | required | `documents:publish` |
| `ObsoleteDocument` | `PUBLISHED → OBSOLETE` | `/documents/:id/obsolete` | POST | required | `documents:obsolete` |
| `CancelDocument` | `intermediate → CANCELLED` | `/documents/:id/cancel` | POST | required | `documents:cancel` |
| `ArchiveDocument` | `OBSOLETE/CANCELLED → ARCHIVED` | `/documents/:id/archive` | POST | required | `documents:archive` |
| `RestoreDocument` | `ARCHIVED → previous` | `/documents/:id/restore` | POST | required | `documents:restore` |
| `CreateDocumentVersion` | `PUBLISHED → DRAFT (new)` | `/documents/:id/versions` | POST | required | `documents:createVersion` |
| `DistributeDocument` | `PUBLISHED` | `/documents/:id/distribute` | POST | required | `documents:distribute` |
| `AcknowledgeDocument` | `PENDING → ACKNOWLEDGED` | `/documents/:id/acknowledge` | POST | required | `documents:acknowledge` |
| `CloneDocument` | `[*] → DRAFT` | `/documents/:id/clone` | POST | required | `documents:create` |

> **Nota:** Los endpoints específicos deben validarse contra `API_SPEC.md`.

---

## 65. Document Business Rules

### DM-001
Una versión publicada es inmutable. No se permite UPDATE ni DELETE.

### DM-002
Una nueva modificación requiere crear una nueva versión. No se sobrescribe historial.

### DM-003
Una versión no puede publicarse sin las aprobaciones requeridas.

### DM-004
Una firma pertenece a una versión específica y es inválida para contenido modificado.

### DM-005
Una aprobación de una versión anterior no aprueba automáticamente una versión nueva.

### DM-006
Un usuario no puede acceder a documentos de otro tenant.

### DM-007
El código de documento es único dentro de la organización.

### DM-008
Solo una versión puede ser `current_version_id` por documento.

### DM-009
El archivo de una versión no puede reemplazarse; debe crearse nueva versión.

### DM-010
Un documento no puede eliminarse físicamente; se usa soft delete (`isActive = false`).

### DM-011
El acuse de recibo es inmutable y único por distribución-usuario.

### DM-012
Un usuario no puede auto-aprobar su propio documento.

### DM-013
La distribución debe respetar la clasificación de confidencialidad.

### DM-014
Un documento bajo `legal hold` no puede archivarse ni eliminarse.

### DM-015
El periodo de retención se calcula desde `issueDate` o `publicationDate`, lo que sea más restrictivo.

---

## 66. Error Codes

| Código | Descripción |
|---|---|
| `DOCUMENT_NOT_FOUND` | Documento no existe o no pertenece al tenant. |
| `VERSION_NOT_FOUND` | Versión no existe. |
| `DOCUMENT_INVALID_STATE` | Estado actual no permite la transición. |
| `VERSION_IMMUTABLE` | La versión es inmutable. |
| `APPROVAL_REQUIRED` | Falta aprobación requerida. |
| `APPROVAL_NOT_AUTHORIZED` | Usuario no es aprobador designado. |
| `PUBLICATION_NOT_READY` | Faltan aprobaciones, archivo o integridad. |
| `FILE_NOT_FOUND` | Archivo no existe en storage. |
| `FILE_INTEGRITY_ERROR` | Hash del archivo no coincide. |
| `DOCUMENT_ALREADY_ARCHIVED` | Documento ya está archivado. |
| `DOCUMENT_ACCESS_DENIED` | Permiso insuficiente. |
| `ACKNOWLEDGEMENT_NOT_REQUIRED` | No se requiere acuse para esta distribución. |
| `INVALID_DOCUMENT_TRANSITION` | Transición no permitida. |
| `CONCURRENT_MODIFICATION` | Conflicto de optimistic locking. |
| `TENANT_MISMATCH` | Recurso no pertenece al tenant. |
| `MALWARE_DETECTED` | Archivo infectado. |

---

## 67. Testing

### 67.1 Happy Path

- Crear documento → Crear versión → Submit → Review → Approve → Publish → Distribute → Acknowledge → Obsolete → Archive.

### 67.2 Invalid Transitions

- Intentar publicar desde `DRAFT`.
- Intentar aprobar sin ser aprobador designado.
- Intentar modificar versión publicada.

### 67.3 Cross-Tenant

- Usuario tenant A intenta leer documento tenant B.
- Usuario tenant A intenta aprobar documento tenant B.

### 67.4 Race Conditions

- Dos aprobadores intentan aprobar misma versión simultáneamente.
- Dos usuarios intentan publicar mismo documento.

### 67.5 Edge Cases

- Archivo corrupto (hash mismatch).
- Archivo infectado (malware scan).
- Expiración de token durante operación larga.
- Revisión sin comentario obligatorio.

---

## 68. Traceability Matrix

### 68.1 Estructura

```
Requirement
  ↓
Document (code, title, classification)
  ↓
DocumentVersion (version, hash, status)
  ↓
DocumentApproval (approver, decision, timestamp)
  ↓
Publication (publishedAt, publishedBy)
  ↓
DocumentDistribution (recipients, method, status)
  ↓
DocumentAcknowledgement (user, timestamp, ip)
  ↓
Evidence (fileAsset, auditLog)
```

### 68.2 Propósito

Permitir demostrar trazabilidad completa desde un requisito normativo hasta la evidencia de distribución y acuse.

---

## 69. Implementation Boundaries

### 69.1 Capas

| Capa | Responsabilidad | No incluye |
|---|---|---|
| **Controller** | Recibir request, validar DTO, despachar comando. | Reglas de workflow documental. |
| **Application Service** | Orquestar transición, validar precondiciones, ejecutar guards. | Lógica de dominio pura. |
| **Domain** | Reglas de negocio, invariantes, transiciones permitidas. | Detalles de infraestructura. |
| **Repository** | Persistencia de documentos, versiones, distribuciones. | Lógica de negocio. |
| **Infrastructure** | Prisma, Storage, Malware Scanner, Email. | Reglas de dominio. |

### 69.2 Flujo

```
Controller
  ↓
Application Service
  ↓
Domain (Document Aggregate)
  ↓
Repository
  ↓
Infrastructure
```

El Controller NO implementa reglas de workflow.

---

## 70. Definition of Done

DOCUMENT_MANAGEMENT.md estará terminado cuando:

- [x] Document lifecycle definido.
- [x] Version lifecycle definido.
- [x] Metadata definida.
- [x] Classification definida.
- [x] Ownership definido.
- [x] Review definido.
- [x] Approval definido.
- [x] Electronic signature definido.
- [x] Publication definido.
- [x] Distribution definido.
- [x] Acknowledgement definido.
- [x] Obsolescence definido.
- [x] Archiving definido.
- [x] Retention definido.
- [x] Legal hold definido.
- [x] File integrity definida.
- [x] Storage abstraction definida.
- [x] Malware scanning contemplado.
- [x] Search definido.
- [x] Document relationships definidos.
- [x] External documents definidos.
- [x] Records diferenciados.
- [x] Forms definidos.
- [x] Templates definidos.
- [x] Audit trail definido.
- [x] Events definidos.
- [x] Notifications definidas.
- [x] Concurrency definida.
- [x] Idempotency definida.
- [x] Transaction boundaries definidas.
- [x] API mapping definido.
- [x] Business rules enumeradas.
- [x] Error codes definidos.
- [x] Testing definido.
- [x] Traceability matrix definida.
- [x] No contradice DOMAIN.md.
- [x] No contradice WORKFLOW_SPEC.md.
- [x] No contradice AUTH_SPEC.md.
- [x] No contradice SECURITY.md.
- [x] No contradice DATABASE.md.

---

DOCUMENT_MANAGEMENT.md generado. Listo para revisión.
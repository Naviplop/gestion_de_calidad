# ADMINISTRATOR GUIDE — V1.0

## 1. Configuración Inicial

### 1.1 Variables de entorno

Editar `backend/.env`:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/qms_prod?schema=public
JWT_SECRET=<SECRET_0e94a36f>-random-secret
CORS_ORIGIN=https://qms-platform.com
STORAGE_ROOT=./storage
MAX_FILE_SIZE_MB=20
AUTH_THROTTLE_TTL=60
AUTH_THROTTLE_LIMIT=5
LOG_LEVEL=warn
APP_VERSION=1.0.0
```

### 1.2 Base de datos

```bash
cd backend
npx prisma migrate deploy
npm run seed
npm run seed
npm run seed
```

### 1.3 Storage

```bash
mkdir -p ./storage
chmod 755 ./storage
```

---

## 2. Usuarios y Roles

### Roles predefinidos
| Rol | Permisos |
| --- | -------- |
| ADMIN | Acceso total |
| MANAGER | Gestión operativa |
| AUDITOR | Lectura + hallazgos |
| USER | Operación básica |

### Crear usuario
1. Ir a `/users`
2. Click en "New User"
3. Completar:
   - Email
   - Nombre
   - Apellido
   - Password inicial
   - Rol
4. Guardar

### Activar/Desactivar
- Desactivar usuario en lugar de eliminar para preservar trazabilidad.

---

## 3. Seguridad

### MFA
- Habilitar MFA para usuarios administrativos
- Distribuir códigos de recovery de forma segura

### Passwords
- Política: mínimo 8 caracteres, mayúscula, minúscula, número, símbolo
- No almacenar passwords en texto plano
- Forzar cambio periódico si es requerido

### Sesiones
- Refresh tokens: 7 días
- Access tokens: 15 minutos
- Revocar tokens al cambiar password

---

## 4. Documentos

### Tipos de documento
- Política
- Procedimiento
- Instructivo
- Registro
- Plan

### Lifecycle
No modificar el flujo de estados definido en C.13. El backend es la autoridad.

### Versiones
- Cada edición crea una nueva versión
- No se puede modificar una versión aprobada/publicada

---

## 5. Auditorías

### Programa
- Definir periodo
- Asignar responsable
- Vincular procesos/documentos

### Auditoría
- Estados: PLANNED → IN_PROGRESS → COMPLETED / CANCELLED
- Checklist con items PASS/FAIL/NA
- Findings generados desde checklist

---

## 6. No Conformidades

### Flujo obligatorio
1. NC abierta (OPEN)
2. Root cause analizada
3. CAPA creada
4. CAPA verificada
5. NC cerrada (CLOSED)

El sistema valida que no se puede cerrar una NC sin root cause y CAPA verificadas.

---

## 7. Riesgos

### Assessment
- Probabilidad: LOW, MEDIUM, HIGH
- Impacto: LOW, MEDIUM, HIGH, CRITICAL
- Score: LOW, MEDIUM, HIGH, CRITICAL

### Treatments
- MITIGATE
- TRANSFER
- ACCEPT
- AVOID

---

## 8. Archivos

### Límites
- Tamaño máximo: 20MB
- Tipos permitidos: PDF, PNG, JPG, WEBP, TXT, DOCX

### Soft delete
- Los archivos eliminados se marcan como `deletedAt`
- No se borran físamente
- Si están asociados a versión publicada, el borrado se bloquea

---

## 9. Audit Trail

- Eventos de negocio: DOCUMENT_CREATED, AUDIT_COMPLETED, NC_CLOSED, etc.
- Eventos de seguridad: PERMISSION_DENIED, IDOR_VIOLATION, AUTH_FAILURE
- Nunca se registran passwords, tokens, JWTs ni secrets

---

## 10. Mantenimiento

### Logs
- Backend: logs estructurados con correlationId
- Revisar errores en `/var/log/qms/` o consola

### Base de datos
- Backup diario programado
- Verificar integridad semanalmente

### Storage
- Verificar espacio disponible
- Revisar archivos huérfanos periódicamente

### Dependencias
- Revisar `npm audit` mensualmente
- Aplicar parches no-breaking cuando sea posible

---

## 11. Troubleshooting

| Problema | Solución |
| -------- | -------- |
| Backend no inicia | Verificar DATABASE_URL, JWT_SECRET, puerto disponible |
| Frontend no carga | Verificar VITE_API_BASE_URL, CORS, build |
| Login falla | Verificar usuario activo, password correcto, MFA |
| Archivo no sube | Verificar tamaño <20MB, tipo permitido, storage permissions |
| Seed falla | Verificar base de datos vacía o limpia |
| Error 500 | Revisar logs backend |
| Error CORS | Verificar CORS_ORIGIGIN en backend |

---

## 12. Contactos

| Rol | Contacto |
| --- | -------- |
| Soporte Técnico | [contacto] |
| DBA | [contacto] |
| Seguridad | [contacto] |

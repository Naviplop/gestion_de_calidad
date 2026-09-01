# USER GUIDE — V1.0

## 1. Acceso

Abrir navegador en la URL proporcionada por el administrador.

Ejemplo: `https://staging.qms-platform.com`

---

## 2. Login

1. Ingresar email corporativo
2. Ingresar contraseña
3. Si tiene MFA habilitado, ingresar código de 6 dígitos desde app autenticadora

### Problemas comunes
- **Credenciales incorrectas:** Verificar email y password. Contactar administrador si persiste.
- **MFA no funciona:** Usar código de recovery de un solo uso.

---

## 3. MFA / Security Settings

Ir a `/security`.

### Pestaña MFA
- Habilitar/deshabilitar MFA
- Generar códigos de recovery (guardar en lugar seguro)
- Ver estado actual

### Pestaña Password
- Cambiar contraseña actual
- Requiere password actual

### Pestaña Recovery
- Solicitar recupero de password por email
- Reset con token

---

## 4. Dashboard

Muestra:
- Documentos pendientes de revisión
- Auditorías en progreso
- No conformidades abiertas
- Riesgos activos
- Acciones correctivas pendientes

---

## 5. Documents

### Crear documento
1. Ir a `/documents`
2. Click en "New Document"
3. Completar:
   - Título
   - Tipo
   - Clasificación
   - Responsable
   - Propietario
4. Subir archivo (PDF, PNG, JPG, WEBP, TXT, DOCX — máximo 20MB)
5. Guardar

### Editar documento
1. Abrir documento
2. Modificar metadatos
3. Guardar

### Lifecycle
| Estado | Acción | Descripción |
| ------ | ------ | ----------- |
| DRAFT | Submit | Enviar a revisión |
| IN_REVIEW | Submit for Approval | Enviar a aprobación |
| PENDING_APPROVAL | Approve / Reject | Aprobar o rechazar |
| APPROVED | Publish | Publicizar |
| PUBLISHED/CURRENT | Obsolete | Marcar obsoleto |
| Cualquier | Cancel | Cancelar documento |

### Distribuir
1. Abrir documento publicado
2. Click en "Distribute"
3. Seleccionar usuarios/departamentos/roles
4. Confirmar

Los destinatarios recibirán la notificación y deberán acknowledge.

---

## 6. Audits

### Programa de auditoría
1. Ir a `/audit-programs`
2. Crear programa con periodo y responsable

### Auditoría
1. Dentro del programa, crear auditoría
2. Definir alcance, objetivos, tipo
3. Asignar lead auditor

### Checklist
1. Abrir auditoría
2. Crear checklist items
3. Marcar items como PASS/FAIL/NA

### Findings
1. Desde checklist, registrar finding
2. Si severity es MAJOR/CRITICAL, generar NC automáticamente

---

## 7. Nonconformities

1. Ir a `/nonconformities`
2. Ver NC abiertas
3. Abrir NC:
   - Ver descripción y severity
   - Ver root cause
   - Ver CAPA asociada
   - Ver verification

### Lifecycle
- OPEN → VERIFICATION → CLOSED

Solo se puede cerrar cuando:
- Existe root cause analizada
- Existe al menos una CAPA
- Todas las CAPA tienen verification

---

## 8. CAPA (Corrective Actions)

1. Dentro de una NC, ir a "Corrective Actions"
2. Crear acción:
   - Descripción
   - Responsable
   - Fecha límite
3. Completar acción (cuando se implementa)
4. Verificar acción (cuando se evidencia efectividad)

### Estados
- PENDING
- IN_PROGRESS
- COMPLETED
- VERIFIED
- CLOSED

---

## 9. Risks

1. Ir a `/risks`
2. Crear riesgo:
   - Título
   - Descripción
   - Tipo
   - Propietario

### Assessment
1. Abrir riesgo
2. Crear assessment:
   - Probabilidad
   - Impacto
   - Score

### Controls
1. Agregar controles preventivos/detectivos
2. Evaluar efectividad

### Treatments
1. Definir estrategia: MITIGATE, TRANSFER, ACCEPT, AVOID
2. Asignar responsable y fecha
3. Completar tratamiento

---

## 10. Files

### Upload
1. Desde documento o versión
2. Seleccionar archivo
3. El sistema calcula SHA-256 automáticamente

### Download
1. Abrir documento/versión
2. Click en descargar
3. Verificar integridad si es necesario

### Restricciones
- Máximo 20MB
- Tipos permitidos: PDF, PNG, JPG, WEBP, TXT, DOCX
- No se permiten archivos ejecutables

---

## 11. Audit Logs

1. Ir a `/audit-logs`
2. Filtrar por:
   - Acción
   - Entidad
   - Fecha
   - Usuario

Ver trazabilidad de:
- Creación/edición de documentos
- Cambios de estado
- Accesos denegados
- Eventos de seguridad

---

## 12. Security Events

1. Ir a `/security-events`
2. Ver eventos:
   - PERMISSION_DENIED
   - IDOR_VIOLATION
   - AUTH_FAILURE
   - etc.

Solo visible para administradores.

---

## 13. Users

1. Ir a `/users`
2. Ver usuarios activos/inactivos/bloqueados
3. Crear usuario
4. Asignar roles
5. Activar/desactivar

---

## 14. Organization Settings

1. Ir a `/organization`
2. Editar:
   - Nombre
   - Configuración general
3. Guardar

---

## 15. Logout

1. Click en logout
2. El sistema revoca refresh token
3. Redirige a login

---

## 16. Tips

- **Loading:** Si una acción tarda, verificar el spinner. No recargar la página.
- **Errores:** Si aparece error, leer mensaje. Si persiste, contactar administrador.
- **Sesión:** El access token expira en 15 minutos. El sistema renueva automáticamente con refresh token.
- **Filtros:** Usar búsqueda y filtros en listados para encontrar rápido.

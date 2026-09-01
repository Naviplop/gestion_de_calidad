# STAGING DEPLOYMENT RUNBOOK

## 1. Requisitos

### Hardware/Cloud
- Servidor Linux/Windows con Docker (opcional pero recomendado)
- Acceso a red interna o VPN para staging

### Software
- Node.js 20.x LTS
- PostgreSQL 14.x o superior
- npm 9.x o superior

### Cuentas/Accesos
- Acceso a base de datos staging
- Acceso a servidor de archivos/storage
- Credenciales de deployment

---

## 2. Variables de Entorno

Copiar `.env.example` a `.env` en backend y configurar:

```env
NODE_ENV=staging
PORT=3001
DATABASE_URL=postgresql://staging_user:staging_pass@staging-db:5432/qms_staging?schema=public
JWT_SECRET=<SECRET_8dca5f0d>strong-random-secret-min-32-chars
CORS_ORIGIN=https://staging.qms-platform.com
STORAGE_ROOT=./storage
MAX_FILE_SIZE_MB=20
AUTH_THROTTLE_TTL=60
AUTH_THROTTLE_LIMIT=5
LOG_LEVEL=info
APP_VERSION=1.0.0-staging
```

**Importante:**
- `JWT_SECRET` debe ser único por ambiente y nunca versionado en Git.
- `DATABASE_URL` debe apuntar a la base de datos staging.
- `CORS_ORIGIN` debe coincidir con el dominio del frontend.

---

## 3. Base de Datos

### 3.1 Crear base de datos

```bash
psql -U postgres -c "CREATE DATABASE qms_staging;"
psql -U postgres -c "CREATE USER staging_user WITH PASSWORD 'staging_pass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE qms_staging TO staging_user;"
```

### 3.2 Aplicar migrations

```bash
cd backend
npm run migration
```

### 3.3 Ejecutar seed

```bash
npm run seed
npm run seed
npm run seed
```

Verificar salida:
```
Organization: ISO Management Demo
Users: 8 | Departments: 5 | Areas: 6 | Processes: 8
Documents: 9 | Audit Programs: 2 | Audits: 3
Findings: 4 | Nonconformities: 3 | Corrective Actions: 4
Risks: 5 | Risk Assessments: 5 | Controls: 10
```

---

## 4. Backend

### 4.1 Instalar dependencias

```bash
cd backend
npm ci --production=false
```

### 4.2 Compilar

```bash
npm run build
```

### 4.3 Iniciar

```bash
npm run start
```

Verificar health:
```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/health/readiness
curl http://localhost:3001/api/v1/health/liveness
```

---

## 5. Frontend

### 5.1 Instalar dependencias

```bash
cd frontend
npm ci
```

### 5.2 Configurar variables de entorno

Crear `.env.production`:
```env
VITE_API_BASE_URL=https://staging.qms-platform.com/api/v1
VITE_APP_VERSION=1.0.0-staging
```

### 5.3 Compilar

```bash
npm run build
```

### 5.4 Servir

Usar cualquier servidor estático sobre `dist/`:
```bash
npm run preview
```

O configurar Nginx para servir `dist/` con SPA fallback a `index.html`.

---

## 6. Storage

### 6.1 Directorio

```bash
mkdir -p ./storage
chmod 755 ./storage
```

### 6.2 Permisos

El usuario que ejecuta el backend debe tener permisos de lectura/escritura en `STORAGE_ROOT`.

### 6.3 Verificación

Subir un archivo de prueba desde la UI y confirmar:
- Archivo almacenado en `STORAGE_ROOT`
- Registro en tabla `file_assets`
- SHA-256 coincide
- Download funciona

---

## 7. HTTPS (Producción/Staging)

### Nginx (ejemplo)

```nginx
server {
    listen 443 ssl http2;
    server_name staging.qms-platform.com;

    ssl_certificate /etc/letsencrypt/live/staging.qms-platform.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.qms-platform.com/privkey.pem;

    # Frontend
    root /var/www/qms-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/v1/ {
        proxy_pass http://localhost:3001/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

### Cookies

El backend ya configura refresh tokens como HttpOnly Secure SameSite cuando `NODE_ENV=production` o `staging`.

---

## 8. CORS

Configurado en `main.ts`:
- Origin desde `CORS_ORIGIN`
- Credentials: true
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allowed headers incluyen CSRF y Correlation-ID

---

## 9. CSRF

El middleware CSRF valida `X-CSRF-Token` contra cookie `x-csrftoken` para requests con header `Authorization`.

Asegurar que el frontend envíe el header en requests mutantes (POST, PATCH, DELETE).

---

## 10. Smoke Tests

### Backend

```bash
# Health
curl -f http://localhost:3001/api/v1/health
curl -f http://localhost:3001/api/v1/health/readiness
curl -f http://localhost:3001/api/v1/health/liveness

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iso-management.local","password":"ChangeMe123!"}'
```

### Frontend

Abrir navegador en `https://staging.qms-platform.com` y verificar:
- Página carga sin errores
- Login funciona
- Dashboard responde

---

## 11. Rollback

### Backend

```bash
# Detener proceso
pm2 stop qms-backend || pkill -f "node dist/main"

# Restaurar versión anterior
git checkout <commit-anterior>
npm ci
npm run build
npm run start
```

### Base de datos

```bash
# Rollback de migrations
cd backend
npx prisma migrate resolve --rolled-back <migration-name>
```

### Storage

Si el storage tiene snapshots o backups, restaurar desde el punto anterior.

---

## 12. Backup

### Base de datos

```bash
pg_dump -U staging_user -d qms_staging -F c -f backup_$(date +%Y%m%d).dump
```

### Storage

```bash
tar -czf storage_backup_$(date +%Y%m%d).tar.gz ./storage
```

### Frecuencia recomendada

- Base de datos: daily
- Storage: daily
- Retención: 30 días

---

## 13. Recovery

1. Restaurar base de datos desde backup
2. Restaurar storage desde backup
3. Aplicar migrations hasta la versión actual
4. Ejecutar seed si es necesario
5. Iniciar backend
6. Iniciar frontend
7. Ejecutar smoke tests
8. Validar integridad de datos

---

## 14. Troubleshooting

### Backend no inicia

- Verificar `DATABASE_URL`
- Verificar `JWT_SECRET` definido
- Verificar puerto disponible
- Verificar logs en `logs/`

### Frontend no carga

- Verificar `VITE_API_BASE_URL`
- Verificar CORS en backend
- Verificar build en `dist/`

### Base de datos no conecta

- Verificar servicio PostgreSQL activo
- Verificar credenciales
- Verificar firewall

### Storage no accesible

- Verificar permisos de directorio
- Verificar ruta en `STORAGE_ROOT`
- Verificar espacio en disco

---

## 15. Contactos

| Rol | Contacto |
| --- | -------- |
| DevOps | [contacto] |
| Backend Lead | [contacto] |
| Frontend Lead | [contacto] |
| QA | [contacto] |
| Cliente | [contacto] |

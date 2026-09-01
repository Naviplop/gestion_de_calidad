# BACKUP & RECOVERY RUNBOOK

## 1. Política de Backup

### Frecuencia
- **Base de datos:** Daily (cada 24 horas)
- **Storage:** Daily (cada 24 horas)
- **Configuración:** On-demand (después de cambios)

### Retención
- **Backups diarios:** 30 días
- **Backups semanales:** 90 días (opcional)
- **Backups mensuales:** 1 año (opcional)

### Almacenamiento
- Backups locales en servidor de staging
- Réplica en almacenamiento externo/cloud si aplica

---

## 2. Backup de Base de Datos

### Comando manual

```bash
pg_dump -U staging_user -d qms_staging -F c -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Comando automatizado (cron)

```bash
0 2 * * * pg_dump -U staging_user -d qms_staging -F c -f /backups/qms_staging_$(date +\%Y\%m\%d).dump
```

### Verificar backup

```bash
pg_restore --list backup_20260901.dump | head
```

---

## 3. Backup de Storage

### Comando manual

```bash
tar -czf storage_backup_$(date +%Y%m%d_%H%M%S).tar.gz ./storage
```

### Comando automatizado (cron)

```bash
0 3 * * * tar -czf /backups/storage_$(date +\%Y\%m\%d).tar.gz /var/www/qms/storage
```

---

## 4. Backup de Configuración

```bash
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  backend/.env \
  backend/prisma/ \
  nginx/
```

---

## 5. Recovery

### 5.1 Pre-requisitos

- Acceso al servidor staging
- Backups disponibles
- Servicio PostgreSQL detenido (opcional para restore completo)

### 5.2 Restore de base de datos

```bash
# Opción A: Restore completo (sobreescribe)
pg_restore -U staging_user -d qms_staging -c backup_20260901.dump

# Opción B: Restore sin borrar datos existentes
pg_restore -U staging_user -d qms_staging -a backup_20260901.dump
```

### 5.3 Restore de storage

```bash
tar -xzf storage_backup_20260901.tar.gz -C /var/www/qms/
```

### 5.4 Restore de configuración

```bash
tar -xzf config_backup_20260901.tar.gz -C /var/www/qms/
```

---

## 6. Post-Recovery

### 6.1 Verificar integridad

```bash
# Backend
npm run typecheck
npm run test
npm run build

# Frontend
npm run typecheck
npm run test
npm run build
```

### 6.2 Ejecutar seed si es necesario

```bash
cd backend
npm run seed
npm run seed
npm run seed
```

### 6.3 Smoke tests

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

### 6.4 Validar frontend

Abrir navegador y verificar:
- Página carga
- Login funciona
- Dashboard responde

---

## 7. Rollback Rápido

### Backend

```bash
pm2 stop qms-backend || pkill -f "node dist/main"
git checkout <commit-anterior>
npm ci
npm run build
npm run start
```

### Base de datos

```bash
cd backend
npx prisma migrate resolve --rolled-back 20260831233000_add_missing_indexes
npx prisma migrate deploy
```

### Frontend

```bash
pm2 stop qms-frontend || pkill -f "vite preview"
git checkout <commit-anterior>
npm ci
npm run build
npm run preview
```

---

## 8. Disaster Recovery

### Escenario: Servidor completo caído

1. Provisionar nuevo servidor
2. Instalar software base (Node.js, PostgreSQL, nginx)
3. Restaurar backups
4. Configurar variables de entorno
5. Ejecutar migrations
6. Ejecutar seed
7. Iniciar servicios
8. Ejecutar smoke tests
9. Validar DNS/apuntamiento

### Escenario: Base de datos corrupta

1. Detener aplicación
2. Restaurar backup más reciente
3. Aplicar migrations hasta la versión actual
4. Ejecutar seed si es necesario
5. Iniciar aplicación
6. Validar

### Escenario: Storage dañado

1. Detener aplicación
2. Restaurar backup de storage
3. Iniciar aplicación
4. Validar upload/download

---

## 9. Monitoreo Post-Recovery

- [ ] Backend health checks responden 200
- [ ] Frontend carga sin errores
- [ ] Login funciona
- [ ] Seed data presente
- [ ] Audit logs se generan
- [ ] Files upload/download funcionan
- [ ] No errores 500 en consola del navegador
- [ ] No pantallas blancas

---

## 10. Contactos de Emergencia

| Rol | Contacto |
| --- | -------- |
| DevOps | [contacto] |
| Backend Lead | [contacto] |
| Frontend Lead | [contacto] |
| DBA | [contacto] |

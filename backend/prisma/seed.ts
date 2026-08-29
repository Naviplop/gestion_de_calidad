import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 65536,
  parallelism: 4,
  hashLength: 32,
  saltLength: 16,
} as const;

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

const PERMISSIONS = [
  { resource: 'documents', action: 'read', description: 'List and view documents' },
  { resource: 'documents', action: 'create', description: 'Create new documents' },
  { resource: 'documents', action: 'update', description: 'Edit document metadata' },
  { resource: 'documents', action: 'submit', description: 'Submit document for review' },
  { resource: 'documents', action: 'approve', description: 'Approve or reject documents' },
  { resource: 'documents', action: 'publish', description: 'Publish approved documents' },
  { resource: 'documents', action: 'obsolete', description: 'Mark documents as obsolete' },
  { resource: 'documents', action: 'cancel', description: 'Cancel draft documents' },
  { resource: 'documents', action: 'createVersion', description: 'Create new document versions' },
  { resource: 'documents', action: 'review', description: 'Review document versions' },
  { resource: 'documents', action: 'distribute', description: 'Distribute documents' },
  { resource: 'documents', action: 'acknowledge', description: 'Acknowledge distributions' },
  { resource: 'audits', action: 'read', description: 'View audits' },
  { resource: 'audits', action: 'create', description: 'Create audits' },
  { resource: 'audits', action: 'update', description: 'Edit audits' },
  { resource: 'audits', action: 'start', description: 'Start audits' },
  { resource: 'audits', action: 'complete', description: 'Complete audits' },
  { resource: 'audits', action: 'cancel', description: 'Cancel audits' },
  { resource: 'audits', action: 'createFindings', description: 'Create findings' },
  { resource: 'audits', action: 'updateFindings', description: 'Update findings' },
  { resource: 'nonconformities', action: 'read', description: 'View nonconformities' },
  { resource: 'nonconformities', action: 'create', description: 'Create nonconformities' },
  { resource: 'nonconformities', action: 'update', description: 'Edit nonconformities' },
  { resource: 'nonconformities', action: 'close', description: 'Close nonconformities' },
  { resource: 'nonconformities', action: 'createActions', description: 'Create corrective actions' },
  { resource: 'nonconformities', action: 'updateActions', description: 'Update corrective actions' },
  { resource: 'nonconformities', action: 'verifyActions', description: 'Verify corrective actions' },
  { resource: 'risks', action: 'read', description: 'View risks' },
  { resource: 'risks', action: 'create', description: 'Create risks' },
  { resource: 'risks', action: 'update', description: 'Edit risks' },
  { resource: 'risks', action: 'assess', description: 'Assess risks' },
  { resource: 'risks', action: 'createTreatments', description: 'Create treatments' },
  { resource: 'risks', action: 'updateTreatments', description: 'Update treatments' },
  { resource: 'users', action: 'read', description: 'List users' },
  { resource: 'users', action: 'create', description: 'Create users' },
  { resource: 'users', action: 'update', description: 'Edit users' },
  { resource: 'users', action: 'activate', description: 'Activate users' },
  { resource: 'users', action: 'deactivate', description: 'Deactivate users' },
  { resource: 'users', action: 'assignRoles', description: 'Assign roles' },
  { resource: 'roles', action: 'read', description: 'View roles' },
  { resource: 'roles', action: 'create', description: 'Create roles' },
  { resource: 'roles', action: 'update', description: 'Edit roles' },
  { resource: 'roles', action: 'deactivate', description: 'Deactivate roles' },
  { resource: 'organization', action: 'read', description: 'View organization' },
  { resource: 'organization', action: 'update', description: 'Update organization' },
  { resource: 'organization', action: 'updateSettings', description: 'Update settings' },
  { resource: 'organization', action: 'updateStandards', description: 'Update standards' },
  { resource: 'departments', action: 'read', description: 'List departments' },
  { resource: 'departments', action: 'create', description: 'Create departments' },
  { resource: 'departments', action: 'update', description: 'Edit departments' },
  { resource: 'departments', action: 'deactivate', description: 'Deactivate departments' },
  { resource: 'processes', action: 'read', description: 'List processes' },
  { resource: 'processes', action: 'create', description: 'Create processes' },
  { resource: 'processes', action: 'update', description: 'Edit processes' },
  { resource: 'processes', action: 'deactivate', description: 'Deactivate processes' },
  { resource: 'areas', action: 'read', description: 'List areas' },
  { resource: 'areas', action: 'create', description: 'Create areas' },
  { resource: 'areas', action: 'update', description: 'Edit areas' },
  { resource: 'areas', action: 'deactivate', description: 'Deactivate areas' },
  { resource: 'files', action: 'read', description: 'View files' },
  { resource: 'files', action: 'upload', description: 'Upload files' },
  { resource: 'files', action: 'download', description: 'Download files' },
  { resource: 'training', action: 'read', description: 'View training' },
  { resource: 'training', action: 'create', description: 'Create training' },
  { resource: 'training', action: 'update', description: 'Edit training' },
  { resource: 'training', action: 'createSessions', description: 'Create sessions' },
  { resource: 'training', action: 'registerParticipants', description: 'Register participants' },
  { resource: 'training', action: 'updateParticipants', description: 'Update participants' },
  { resource: 'indicators', action: 'read', description: 'View indicators' },
  { resource: 'indicators', action: 'create', description: 'Create indicators' },
  { resource: 'indicators', action: 'update', description: 'Edit indicators' },
  { resource: 'indicators', action: 'record', description: 'Record measurements' },
  { resource: 'notifications', action: 'read', description: 'View notifications' },
  { resource: 'notifications', action: 'updatePreferences', description: 'Update preferences' },
  { resource: 'audit-logs', action: 'read', description: 'View audit logs' },
  { resource: 'security-events', action: 'read', description: 'View security events' },
];

const ROLES = [
  { name: 'ADMIN', description: 'Full administrative access', isSystem: true },
  { name: 'MANAGER', description: 'Operations manager', isSystem: false },
  { name: 'AUDITOR', description: 'Audit and compliance', isSystem: false },
  { name: 'USER', description: 'Standard user', isSystem: false },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  MANAGER: [
    'documents:read', 'documents:create', 'documents:update', 'documents:submit', 'documents:approve', 'documents:publish', 'documents:obsolete', 'documents:cancel', 'documents:createVersion', 'documents:review', 'documents:distribute', 'documents:acknowledge',
    'audits:read', 'audits:create', 'audits:update', 'audits:start', 'audits:complete', 'audits:cancel', 'audits:createFindings', 'audits:updateFindings',
    'nonconformities:read', 'nonconformities:create', 'nonconformities:update', 'nonconformities:close', 'nonconformities:createActions', 'nonconformities:updateActions', 'nonconformities:verifyActions',
    'risks:read', 'risks:create', 'risks:update', 'risks:assess', 'risks:createTreatments', 'risks:updateTreatments',
    'users:read', 'users:create', 'users:update', 'users:activate', 'users:deactivate', 'users:assignRoles',
    'roles:read', 'roles:create', 'roles:update', 'roles:deactivate',
    'organization:read', 'organization:update', 'organization:updateSettings', 'organization:updateStandards',
    'departments:read', 'departments:create', 'departments:update', 'departments:deactivate',
    'processes:read', 'processes:create', 'processes:update', 'processes:deactivate',
    'areas:read', 'areas:create', 'areas:update', 'areas:deactivate',
    'files:read', 'files:upload', 'files:download',
    'training:read', 'training:create', 'training:update', 'training:createSessions', 'training:registerParticipants', 'training:updateParticipants',
    'indicators:read', 'indicators:create', 'indicators:update', 'indicators:record',
    'notifications:read', 'notifications:updatePreferences',
    'audit-logs:read', 'security-events:read',
  ],
  AUDITOR: [
    'documents:read',
    'audits:read', 'audits:create', 'audits:update', 'audits:start', 'audits:complete', 'audits:cancel', 'audits:createFindings', 'audits:updateFindings',
    'nonconformities:read', 'nonconformities:create', 'nonconformities:update', 'nonconformities:close', 'nonconformities:createActions', 'nonconformities:updateActions', 'nonconformities:verifyActions',
    'risks:read', 'risks:assess',
    'users:read',
    'roles:read',
    'organization:read',
    'departments:read',
    'processes:read',
    'areas:read',
    'files:read', 'files:upload', 'files:download',
    'training:read',
    'indicators:read',
    'notifications:read',
    'audit-logs:read', 'security-events:read',
  ],
  USER: [
    'documents:read',
    'audits:read',
    'nonconformities:read',
    'risks:read',
    'users:read',
    'roles:read',
    'organization:read',
    'departments:read',
    'processes:read',
    'areas:read',
    'files:read',
    'training:read',
    'indicators:read',
    'notifications:read',
  ],
};

async function main() {
  console.log('Seed started...');

  // ============================================================================
  // 1. ORGANIZATION
  // ============================================================================
  let org = await prisma.organization.findFirst({
    where: { name: 'ISO Management Demo' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'ISO Management Demo', timezone: 'UTC', locale: 'es', isActive: true },
    });
  } else {
    await prisma.organization.update({
      where: { id: org.id },
      data: { isActive: true },
    });
  }
  console.log(`Organization: ${org.name}`);

  // ============================================================================
  // 2. PERMISSIONS
  // ============================================================================
  const permissionIds = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: { description: perm.description },
      create: { resource: perm.resource, action: perm.action, description: perm.description },
    });
    permissionIds.set(`${perm.resource}:${perm.action}`, created.id);
  }
  console.log(`Permissions: ${permissionIds.size} created/updated`);

  // ============================================================================
  // 3. ROLES
  // ============================================================================
  const roleIds = new Map<string, string>();
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { organizationId_name: { organizationId: org.id, name: roleDef.name } },
      update: { description: roleDef.description, isSystem: roleDef.isSystem, isActive: true },
      create: { organizationId: org.id, name: roleDef.name, description: roleDef.description, isSystem: roleDef.isSystem, isActive: true },
    });
    roleIds.set(roleDef.name, role.id);
  }
  console.log(`Roles: ${roleIds.size} created/updated`);

  // ============================================================================
  // 4. ROLE PERMISSIONS
  // ============================================================================
  for (const roleDef of ROLES) {
    const roleId = roleIds.get(roleDef.name)!;
    const perms = ROLE_PERMISSIONS[roleDef.name] || [];
    for (const key of perms) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.create({
        data: { roleId, permissionId },
      }).catch(() => {});
    }
    console.log(`Role permissions assigned: ${roleDef.name} (${perms.length})`);
  }

  // ============================================================================
  // 5. USERS
  // ============================================================================
  const users = [
    { email: 'admin@iso-management.local', firstName: 'Carlos', lastName: 'Mendoza Rivera', role: 'ADMIN' },
    { email: 'manager@iso-management.local', firstName: 'María Elena', lastName: 'Gutiérrez López', role: 'MANAGER' },
    { email: 'auditor@iso-management.local', firstName: 'Roberto', lastName: 'Fernández Castillo', role: 'AUDITOR' },
    { email: 'user@iso-management.local', firstName: 'Ana Patricia', lastName: 'Sánchez Morales', role: 'USER' },
    { email: 'laura.ramirez@iso-management.local', firstName: 'Laura', lastName: 'Ramírez Torres', role: 'MANAGER' },
    { email: 'jorge.diaz@iso-management.local', firstName: 'Jorge Alberto', lastName: 'Díaz Herrera', role: 'AUDITOR' },
    { email: 'patricia.vargas@iso-management.local', firstName: 'Patricia', lastName: 'Vargas Medina', role: 'USER' },
    { email: 'fernando.lopez@iso-management.local', firstName: 'Fernando', lastName: 'López García', role: 'USER' },
  ];

  const userIds = new Map<string, string>();
  for (const u of users) {
    const passwordHash = await hashPassword('Demo2024Secure!');
    const user = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: { firstName: u.firstName, lastName: u.lastName, isActive: true, passwordHash },
      create: { organizationId: org.id, email: u.email, passwordHash, firstName: u.firstName, lastName: u.lastName, isActive: true },
    });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    const roleId = roleIds.get(u.role)!;
    await prisma.userRole.create({ data: { userId: user.id, roleId, assignedBy: user.id } });
    userIds.set(u.email, user.id);
    console.log(`User: ${u.email} (${u.role})`);
  }

  const adminId = userIds.get('admin@iso-management.local')!;
  const managerId = userIds.get('manager@iso-management.local')!;
  const auditorId = userIds.get('auditor@iso-management.local')!;
  const lauraId = userIds.get('laura.ramirez@iso-management.local')!;
  const jorgeId = userIds.get('jorge.diaz@iso-management.local')!;
  const anaId = userIds.get('user@iso-management.local')!;
  const patriciaId = userIds.get('patricia.vargas@iso-management.local')!;
  const fernandoId = userIds.get('fernando.lopez@iso-management.local')!;

  // ============================================================================
  // 6. DEPARTMENTS
  // ============================================================================
  const departments = [
    { name: 'Dirección', description: 'Dirección General y Estratégica' },
    { name: 'Calidad', description: 'Gestión de Calidad y Mejora Continua' },
    { name: 'Recursos Humanos', description: 'Gestión del Talento Humano' },
    { name: 'Operaciones', description: 'Operaciones y Producción' },
    { name: 'Tecnologías de Información', description: 'Sistemas y Tecnología' },
  ];

  const deptIds = new Map<string, string>();
  for (const dept of departments) {
    const created = await prisma.department.upsert({
      where: { organizationId_name: { organizationId: org.id, name: dept.name } },
      update: { description: dept.description, isActive: true },
      create: { organizationId: org.id, name: dept.name, description: dept.description, isActive: true },
    });
    deptIds.set(dept.name, created.id);
  }
  console.log(`Departments: ${deptIds.size} created/updated`);

  // ============================================================================
  // 7. AREAS
  // ============================================================================
  const areas = [
    { name: 'Dirección General', code: 'AREA-DIR', description: 'Área de dirección y gerencia', deptName: 'Dirección', managerId: adminId },
    { name: 'Sistema de Gestión de Calidad', code: 'AREA-QMS', description: 'Área responsable del SGC', deptName: 'Calidad', managerId: managerId },
    { name: 'Control de Calidad', code: 'AREA-CC', description: 'Área de inspección y control', deptName: 'Calidad', managerId: lauraId },
    { name: 'Gestión de Personal', code: 'AREA-RHH', description: 'Área de administración de personal', deptName: 'Recursos Humanos', managerId: patriciaId },
    { name: 'Planta de Producción', code: 'AREA-PROD', description: 'Área de manufactura y producción', deptName: 'Operaciones', managerId: fernandoId },
    { name: 'Infraestructura Tecnológica', code: 'AREA-TI', description: 'Área de sistemas y TI', deptName: 'Tecnologías de Información', managerId: jorgeId },
  ];

  const areaIds = new Map<string, string>();
  for (const area of areas) {
    const created = await prisma.area.upsert({
      where: { organizationId_name: { organizationId: org.id, name: area.name } },
      update: { code: area.code, description: area.description, managerId: area.managerId, isActive: true },
      create: { organizationId: org.id, name: area.name, code: area.code, description: area.description, managerId: area.managerId, isActive: true },
    });
    areaIds.set(area.name, created.id);
  }
  console.log(`Areas: ${areaIds.size} created/updated`);

  // ============================================================================
  // 8. PROCESSES
  // ============================================================================
  const processes = [
    { code: 'PROC-QMS', name: 'Gestión de Calidad', description: 'Proceso integral de gestión de calidad según ISO 9001', areaName: 'Sistema de Gestión de Calidad', ownerId: managerId, processType: 'ESTRATEGICO' },
    { code: 'PROC-DOC', name: 'Control Documental', description: 'Proceso de gestión y control de documentos del SGC', areaName: 'Sistema de Gestión de Calidad', ownerId: adminId, processType: 'APOYO' },
    { code: 'PROC-AUD', name: 'Auditorías Internas', description: 'Proceso de planificación y ejecución de auditorías internas', areaName: 'Sistema de Gestión de Calidad', ownerId: auditorId, processType: 'VERIFICACION' },
    { code: 'PROC-RISK', name: 'Gestión de Riesgo', description: 'Proceso de identificación y tratamiento de riesgos', areaName: 'Dirección General', ownerId: adminId, processType: 'ESTRATEGICO' },
    { code: 'PROC-NC', name: 'Gestión de No Conformidades', description: 'Proceso de gestión de no conformidades y acciones correctivas', areaName: 'Sistema de Gestión de Calidad', ownerId: managerId, processType: 'MEJORA' },
    { code: 'PROC-RRHH', name: 'Recursos Humanos', description: 'Proceso de gestión del talento humano y capacitación', areaName: 'Gestión de Personal', ownerId: patriciaId, processType: 'APOYO' },
    { code: 'PROC-TI', name: 'Tecnologías de Información', description: 'Proceso de gestión de infraestructura tecnológica', areaName: 'Infraestructura Tecnológica', ownerId: jorgeId, processType: 'APOYO' },
    { code: 'PROC-PROD', name: 'Manufactura', description: 'Proceso de producción y manufactura', areaName: 'Planta de Producción', ownerId: fernandoId, processType: 'OPERATIVO' },
  ];

  const procIds = new Map<string, string>();
  for (const proc of processes) {
    const areaId = areaIds.get(proc.areaName);
    const created = await prisma.process.upsert({
      where: { organizationId_code: { organizationId: org.id, code: proc.code } },
      update: { name: proc.name, description: proc.description, areaId, ownerId: proc.ownerId, processType: proc.processType, isActive: true },
      create: { organizationId: org.id, code: proc.code, name: proc.name, description: proc.description, areaId, ownerId: proc.ownerId, processType: proc.processType, isActive: true },
    });
    procIds.set(proc.code, created.id);
  }
  console.log(`Processes: ${procIds.size} created/updated`);

  // ============================================================================
  // 9. DOCUMENT TYPES
  // ============================================================================
  const docTypes = [
    { name: 'Política', description: 'Documentos de política organizacional' },
    { name: 'Procedimiento', description: 'Procedimientos operativos del SGC' },
    { name: 'Instructivo', description: 'Instructivos de trabajo detallados' },
    { name: 'Registro', description: 'Registros y formularios del SGC' },
    { name: 'Plan', description: 'Planes y programas del SGC' },
  ];

  const docTypeIds = new Map<string, string>();
  for (const dt of docTypes) {
    const created = await prisma.documentType.upsert({
      where: { name: dt.name },
      update: { description: dt.description, isActive: true },
      create: { name: dt.name, description: dt.description, isActive: true },
    });
    docTypeIds.set(dt.name, created.id);
  }
  console.log(`Document Types: ${docTypeIds.size} created/updated`);

  // ============================================================================
  // 10. STANDARDS & REQUIREMENTS
  // ============================================================================
  const standard = await prisma.standard.upsert({
    where: { code: 'ISO-9001-2015' },
    update: { name: 'ISO 9001:2015', description: 'Sistemas de gestión de la calidad - Requisitos', version: '2015', isActive: true },
    create: { code: 'ISO-9001-2015', name: 'ISO 9001:2015', description: 'Sistemas de gestión de la calidad - Requisitos', version: '2015', isActive: true },
  });

  await prisma.organizationStandard.upsert({
    where: { organizationId_standardId: { organizationId: org.id, standardId: standard.id } },
    update: { isActive: true },
    create: { organizationId: org.id, standardId: standard.id, adoptedAt: new Date('2024-01-15'), isActive: true },
  });

  const requirements = [
    { code: 'REQ-4.1', title: 'Comprensión de la organización y su contexto', description: 'Determinar las cuestiones externas e internas pertinentes', clause: '4.1' },
    { code: 'REQ-5.1', title: 'Liderazgo y compromiso', description: 'La alta dirección debe demostrar liderazgo y compromiso', clause: '5.1' },
    { code: 'REQ-6.1', title: 'Acciones para abordar riesgos y oportunidades', description: 'Planificar acciones para abordar riesgos y oportunidades', clause: '6.1' },
    { code: 'REQ-7.2', title: 'Competencia', description: 'Determinar la competencia necesaria del personal', clause: '7.2' },
    { code: 'REQ-8.5.1', title: 'Control de la producción y provisión del servicio', description: 'Control de la producción y provisión del servicio', clause: '8.5.1' },
    { code: 'REQ-9.2', title: 'Auditoría interna', description: 'Realizar auditorías internas a intervalos planificados', clause: '9.2' },
    { code: 'REQ-10.2', title: 'No conformidad y acción correctiva', description: 'Acciones cuando ocurre una no conformidad', clause: '10.2' },
  ];

  const reqIds = new Map<string, string>();
  for (const req of requirements) {
    const created = await prisma.standardRequirement.upsert({
      where: { standardId_code: { standardId: standard.id, code: req.code } },
      update: { title: req.title, description: req.description, clause: req.clause },
      create: { standardId: standard.id, code: req.code, title: req.title, description: req.description, clause: req.clause },
    });
    reqIds.set(req.code, created.id);
  }
  console.log(`Standards & Requirements: ${reqIds.size} created/updated`);

  // ============================================================================
  // 11. DOCUMENTS
  // ============================================================================
  const documents = [
    {
      code: 'DOC-POL-001', title: 'Política de Calidad', description: 'Política de calidad de ISO Management Demo',
      typeName: 'Política', procCode: 'PROC-QMS', deptName: 'Calidad', status: 'PUBLISHED' as const,
      ownerId: adminId, responsibleId: managerId, issueDate: '2025-01-15', reviewDate: '2025-07-15', nextReviewDate: '2026-01-15',
    },
    {
      code: 'DOC-PCD-001', title: 'Procedimiento de Control Documental', description: 'Procedimiento para el control y gestión de documentos del SGC',
      typeName: 'Procedimiento', procCode: 'PROC-DOC', deptName: 'Calidad', status: 'PUBLISHED' as const,
      ownerId: adminId, responsibleId: adminId, issueDate: '2025-02-01', reviewDate: '2025-08-01', nextReviewDate: '2026-02-01',
    },
    {
      code: 'DOC-PAU-001', title: 'Procedimiento de Auditorías Internas', description: 'Procedimiento para la planificación y ejecución de auditorías internas',
      typeName: 'Procedimiento', procCode: 'PROC-AUD', deptName: 'Calidad', status: 'PUBLISHED' as const,
      ownerId: auditorId, responsibleId: auditorId, issueDate: '2025-03-01', reviewDate: '2025-09-01', nextReviewDate: '2026-03-01',
    },
    {
      code: 'DOC-PRI-001', title: 'Procedimiento de Gestión de Riesgos', description: 'Procedimiento para la identificación, evaluación y tratamiento de riesgos',
      typeName: 'Procedimiento', procCode: 'PROC-RISK', deptName: 'Dirección', status: 'APPROVED' as const,
      ownerId: adminId, responsibleId: adminId, issueDate: '2025-04-01', reviewDate: '2025-10-01', nextReviewDate: '2026-04-01',
    },
    {
      code: 'DOC-PNC-001', title: 'Procedimiento de No Conformidades', description: 'Procedimiento para la gestión de no conformidades y acciones correctivas',
      typeName: 'Procedimiento', procCode: 'PROC-NC', deptName: 'Calidad', status: 'PUBLISHED' as const,
      ownerId: managerId, responsibleId: managerId, issueDate: '2025-02-15', reviewDate: '2025-08-15', nextReviewDate: '2026-02-15',
    },
    {
      code: 'DOC-INS-001', title: 'Instructivo de Inspección de Producto', description: 'Instructivo para la inspección de producto terminado',
      typeName: 'Instructivo', procCode: 'PROC-PROD', deptName: 'Operaciones', status: 'IN_REVIEW' as const,
      ownerId: lauraId, responsibleId: lauraId, issueDate: '2025-05-01', reviewDate: null, nextReviewDate: null,
    },
    {
      code: 'DOC-RNC-001', title: 'Registro de No Conformidades', description: 'Formulario para el registro de no conformidades detectadas',
      typeName: 'Registro', procCode: 'PROC-NC', deptName: 'Calidad', status: 'CURRENT' as const,
      ownerId: managerId, responsibleId: managerId, issueDate: '2025-01-01', reviewDate: null, nextReviewDate: null,
    },
    {
      code: 'DOC-PLN-001', title: 'Plan de Calidad Anual 2026', description: 'Plan anual de actividades de calidad para el año 2026',
      typeName: 'Plan', procCode: 'PROC-QMS', deptName: 'Calidad', status: 'APPROVED' as const,
      ownerId: managerId, responsibleId: managerId, issueDate: '2025-11-01', reviewDate: null, nextReviewDate: null,
    },
    {
      code: 'DOC-PCAP-001', title: 'Procedimiento de Capacitación', description: 'Procedimiento para la gestión de capacitación del personal',
      typeName: 'Procedimiento', procCode: 'PROC-RRHH', deptName: 'Recursos Humanos', status: 'PUBLISHED' as const,
      ownerId: patriciaId, responsibleId: patriciaId, issueDate: '2025-03-15', reviewDate: '2025-09-15', nextReviewDate: '2026-03-15',
    },
  ];

  const docIds = new Map<string, string>();
  for (const doc of documents) {
    const docTypeId = docTypeIds.get(doc.typeName)!;
    const processId = procIds.get(doc.procCode);
    const deptId = deptIds.get(doc.deptName);
    const created = await prisma.document.upsert({
      where: { organizationId_code: { organizationId: org.id, code: doc.code } },
      update: {
        title: doc.title, description: doc.description, documentTypeId: docTypeId,
        processId, departmentId: deptId, ownerId: doc.ownerId, responsibleId: doc.responsibleId,
        status: doc.status, issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
        reviewDate: doc.reviewDate ? new Date(doc.reviewDate) : null,
        nextReviewDate: doc.nextReviewDate ? new Date(doc.nextReviewDate) : null,
        updatedById: adminId,
      },
      create: {
        organizationId: org.id, documentTypeId: docTypeId, code: doc.code, title: doc.title,
        description: doc.description, processId, departmentId: deptId, ownerId: doc.ownerId,
        responsibleId: doc.responsibleId, status: doc.status,
        issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
        reviewDate: doc.reviewDate ? new Date(doc.reviewDate) : null,
        nextReviewDate: doc.nextReviewDate ? new Date(doc.nextReviewDate) : null,
        createdById: adminId, updatedById: adminId,
      },
    });
    docIds.set(doc.code, created.id);
  }
  console.log(`Documents: ${docIds.size} created/updated`);

  // ============================================================================
  // 12. AUDIT PROGRAMS
  // ============================================================================
  const auditPrograms = [
    {
      name: 'Programa de Auditoría Interna 2026',
      description: 'Programa anual de auditorías internas del SGC para el ejercicio 2026',
      periodStart: '2026-01-01', periodEnd: '2026-12-31', responsibleId: auditorId, status: 'ACTIVE',
    },
    {
      name: 'Programa de Auditoría de Procesos 2026',
      description: 'Programa específico de auditorías de procesos operativos',
      periodStart: '2026-01-01', periodEnd: '2026-12-31', responsibleId: jorgeId, status: 'ACTIVE',
    },
  ];

  const auditProgIds = new Map<string, string>();
  for (const ap of auditPrograms) {
    const existing = await prisma.auditProgram.findFirst({ where: { name: ap.name, organizationId: org.id } });
    if (existing) {
      const updated = await prisma.auditProgram.update({
        where: { id: existing.id },
        data: { description: ap.description, responsibleId: ap.responsibleId, status: ap.status },
      });
      auditProgIds.set(ap.name, updated.id);
    } else {
      const created = await prisma.auditProgram.create({
        data: {
          organizationId: org.id, name: ap.name, description: ap.description,
          periodStart: new Date(ap.periodStart), periodEnd: new Date(ap.periodEnd),
          responsibleId: ap.responsibleId, status: ap.status,
        },
      });
      auditProgIds.set(ap.name, created.id);
    }
  }
  console.log(`Audit Programs: ${auditProgIds.size} created/updated`);

  // ============================================================================
  // 13. AUDITS
  // ============================================================================
  const audits = [
    {
      code: 'AUD-001', title: 'Auditoría Interna de Calidad', auditType: 'INTERNAL',
      procCode: 'PROC-QMS', programName: 'Programa de Auditoría Interna 2026',
      leadAuditorId: auditorId, status: 'PLANNED',
      plannedStart: '2026-03-10T09:00:00Z', plannedEnd: '2026-03-14T18:00:00Z',
      scope: 'Proceso de Gestión de Calidad', objective: 'Verificar cumplimiento de requisitos ISO 9001 en el SGC',
    },
    {
      code: 'AUD-002', title: 'Auditoría de Control Documental', auditType: 'INTERNAL',
      procCode: 'PROC-DOC', programName: 'Programa de Auditoría Interna 2026',
      leadAuditorId: jorgeId, status: 'IN_PROGRESS',
      plannedStart: '2026-02-15T09:00:00Z', plannedEnd: '2026-02-17T18:00:00Z',
      actualStart: '2026-02-15T09:00:00Z',
      scope: 'Proceso de Control Documental', objective: 'Verificar la gestión y control de documentos del SGC',
    },
    {
      code: 'AUD-003', title: 'Auditoría de Gestión de Riesgos', auditType: 'INTERNAL',
      procCode: 'PROC-RISK', programName: 'Programa de Auditoría de Procesos 2026',
      leadAuditorId: auditorId, status: 'COMPLETED',
      plannedStart: '2026-01-20T09:00:00Z', plannedEnd: '2026-01-22T18:00:00Z',
      actualStart: '2026-01-20T09:00:00Z', actualEnd: '2026-01-22T17:00:00Z',
      scope: 'Proceso de Gestión de Riesgos', objective: 'Evaluar la efectividad del proceso de gestión de riesgos',
    },
  ];

  const auditIds = new Map<string, string>();
  for (const a of audits) {
    const processId = procIds.get(a.procCode);
    const programId = auditProgIds.get(a.programName);
    const created = await prisma.audit.upsert({
      where: { organizationId_code: { organizationId: org.id, code: a.code } },
      update: {
        title: a.title, auditType: a.auditType, processId, auditProgramId: programId,
        leadAuditorId: a.leadAuditorId, status: a.status,
        plannedStart: new Date(a.plannedStart), plannedEnd: new Date(a.plannedEnd),
        actualStart: a.actualStart ? new Date(a.actualStart) : null,
        actualEnd: a.actualEnd ? new Date(a.actualEnd) : null,
        scope: a.scope, objective: a.objective,
      },
      create: {
        organizationId: org.id, code: a.code, title: a.title, auditType: a.auditType,
        processId, auditProgramId: programId, leadAuditorId: a.leadAuditorId, status: a.status,
        plannedStart: new Date(a.plannedStart), plannedEnd: new Date(a.plannedEnd),
        actualStart: a.actualStart ? new Date(a.actualStart) : null,
        actualEnd: a.actualEnd ? new Date(a.actualEnd) : null,
        scope: a.scope, objective: a.objective,
      },
    });
    auditIds.set(a.code, created.id);
  }
  console.log(`Audits: ${auditIds.size} created/updated`);

  // ============================================================================
  // 14. AUDIT CHECKLISTS & ITEMS
  // ============================================================================
  const checklists = [
    {
      auditCode: 'AUD-002', name: 'Checklist Control Documental',
      items: [
        { question: '¿Los documentos tienen código único?', response: 'YES', evidence: 'Verificado en sistema', reqCode: null },
        { question: '¿Se controla la distribución de documentos?', response: 'YES', evidence: 'Registros de distribución encontrados', reqCode: null },
        { question: '¿Los documentos obsoletos se retiran?', response: 'NO', evidence: 'Se encontraron documentos obsoletos en uso', reqCode: null },
        { question: '¿Se realizan revisiones periódicas?', response: 'PARTIAL', evidence: 'Algunos documentos sin revisión reciente', reqCode: null },
      ],
    },
    {
      auditCode: 'AUD-003', name: 'Checklist Gestión de Riesgos',
      items: [
        { question: '¿Se han identificado riesgos del proceso?', response: 'YES', evidence: 'Matriz de riesgos actualizada', reqCode: 'REQ-6.1' },
        { question: '¿Se evalúan los riesgos con metodología definida?', response: 'YES', evidence: 'Metodología documentada', reqCode: 'REQ-6.1' },
        { question: '¿Existen controles implementados?', response: 'YES', evidence: 'Controles verificados', reqCode: null },
        { question: '¿Se monitorean los riesgos periódicamente?', response: 'YES', evidence: 'Registros de monitoreo', reqCode: null },
      ],
    },
  ];

  const checklistItemIds: string[] = [];
  for (const cl of checklists) {
    const auditId = auditIds.get(cl.auditCode)!;
    const existing = await prisma.auditChecklist.findFirst({ where: { auditId, name: cl.name } });
    let checklistId: string;
    if (existing) {
      checklistId = existing.id;
      await prisma.auditChecklistItem.deleteMany({ where: { checklistId } });
    } else {
      const created = await prisma.auditChecklist.create({
        data: { organizationId: org.id, auditId, name: cl.name },
      });
      checklistId = created.id;
    }

    for (let i = 0; i < cl.items.length; i++) {
      const item = cl.items[i];
      const reqId = item.reqCode ? reqIds.get(item.reqCode) : undefined;
      const created = await prisma.auditChecklistItem.create({
        data: {
          checklistId, requirementId: reqId || null,
          question: item.question, response: item.response, evidence: item.evidence, sortOrder: i,
        },
      });
      checklistItemIds.push(created.id);
    }
  }
  console.log(`Checklists: ${checklists.length} created/updated`);

  // ============================================================================
  // 15. FINDINGS
  // ============================================================================
  const findings = [
    {
      auditCode: 'AUD-002', findingType: 'NON_CONFORMITY', title: 'Documentos obsoletos en uso',
      description: 'Se identificaron documentos obsoletos que no fueron retirados de las áreas de trabajo',
      evidence: 'Observación directa en 3 áreas de trabajo', severity: 'MAJOR', identifiedById: jorgeId, status: 'OPEN',
    },
    {
      auditCode: 'AUD-002', findingType: 'OBSERVATION', title: 'Revisiones periódicas incompletas',
      description: 'Algunos documentos no tienen revisiones periódicas según lo programado',
      evidence: 'Registro de revisiones muestra 5 documentos vencidos', severity: 'MINOR', identifiedById: jorgeId, status: 'OPEN',
    },
    {
      auditCode: 'AUD-003', findingType: 'CONFORMITY', title: 'Proceso de gestión de riesgos implementado',
      description: 'El proceso de gestión de riesgos está correctamente implementado y documentado',
      evidence: 'Matriz de riesgos actualizada, controles verificados', severity: null, identifiedById: auditorId, status: 'CLOSED',
    },
    {
      auditCode: 'AUD-003', findingType: 'OPPORTUNITY', title: 'Oportunidad de mejora en monitoreo',
      description: 'Se puede mejorar la frecuencia de monitoreo de riesgos críticos',
      evidence: 'Revisión de registros de monitoreo', severity: null, identifiedById: auditorId, status: 'CLOSED',
    },
  ];

  const findingIds = new Map<string, string>();
  for (const f of findings) {
    const auditId = auditIds.get(f.auditCode)!;
    const existing = await prisma.auditFinding.findFirst({ where: { auditId, title: f.title } });
    if (existing) {
      const updated = await prisma.auditFinding.update({
        where: { id: existing.id },
        data: { description: f.description, evidence: f.evidence, severity: f.severity, status: f.status, findingType: f.findingType },
      });
      findingIds.set(`${f.auditCode}-${f.title}`, updated.id);
    } else {
      const created = await prisma.auditFinding.create({
        data: { organizationId: org.id, auditId, findingType: f.findingType, title: f.title, description: f.description, evidence: f.evidence, severity: f.severity, identifiedById: f.identifiedById, status: f.status },
      });
      findingIds.set(`${f.auditCode}-${f.title}`, created.id);
    }
  }
  console.log(`Findings: ${findingIds.size} created/updated`);

  // 16. NONCONFORMITIES
  const nonconformities = [
    { code: 'NC-001', title: 'Documentos obsoletos no retirados', description: 'Se detectaron documentos obsoletos en las áreas de trabajo', severity: 'MAJOR', detectedAt: '2026-02-16T10:00:00Z', responsibleId: adminId, status: 'CLOSED', closedAt: '2026-03-01T15:00:00Z', closedById: managerId, auditCode: 'AUD-002', findingTitle: 'Documentos obsoletos en uso', procCode: 'PROC-DOC' },
    { code: 'NC-002', title: 'Revisiones documentales vencidas', description: 'Cinco documentos del SGC tienen revisiones periódicas vencidas', severity: 'MINOR', detectedAt: '2026-02-16T14:00:00Z', responsibleId: adminId, status: 'OPEN', closedAt: null, closedById: null, auditCode: 'AUD-002', findingTitle: 'Revisiones periódicas incompletas', procCode: 'PROC-DOC' },
    { code: 'NC-003', title: 'Falta de capacitación en inspectores', description: 'Dos inspectores de calidad no tienen la capacitación requerida', severity: 'MAJOR', detectedAt: '2026-01-10T09:00:00Z', responsibleId: patriciaId, status: 'VERIFICATION', closedAt: null, closedById: null, auditCode: null, findingTitle: null, procCode: 'PROC-PROD' },
  ];
  const ncIds = new Map<string, string>();
  for (const nc of nonconformities) {
    const auditId = nc.auditCode ? auditIds.get(nc.auditCode) : null;
    const findingId = nc.findingTitle ? findingIds.get(`${nc.auditCode}-${nc.findingTitle}`) : null;
    const processId = nc.procCode ? procIds.get(nc.procCode) : null;
    const created = await prisma.nonconformity.upsert({
      where: { organizationId_code: { organizationId: org.id, code: nc.code } },
      update: { title: nc.title, description: nc.description, severity: nc.severity, detectedAt: new Date(nc.detectedAt), responsibleId: nc.responsibleId, status: nc.status, closedAt: nc.closedAt ? new Date(nc.closedAt) : null, closedById: nc.closedById, auditId: auditId || undefined, findingId: findingId || undefined, processId: processId || undefined },
      create: { organizationId: org.id, code: nc.code, title: nc.title, description: nc.description, severity: nc.severity, detectedAt: new Date(nc.detectedAt), responsibleId: nc.responsibleId, status: nc.status, closedAt: nc.closedAt ? new Date(nc.closedAt) : null, closedById: nc.closedById, auditId: auditId || undefined, findingId: findingId || undefined, processId: processId || undefined },
    });
    ncIds.set(nc.code, created.id);
  }
  console.log(`Nonconformities: ${ncIds.size} created/updated`);

  // 17. ROOT CAUSE ANALYSES
  const rootCauseAnalyses = [
    { ncCode: 'NC-001', methodology: 'FIVE_WHY', analysisData: { whys: ['Documentos obsoletos en uso', 'No se retiraron a tiempo', 'No hay responsable asignado', 'Procedimiento no define responsable', 'No se actualizó procedimiento'] }, conclusion: 'El procedimiento no define responsable de retirada de documentos obsoletos', createdById: adminId },
    { ncCode: 'NC-002', methodology: 'FIVE_WHY', analysisData: { whys: ['Revisiones vencidas', 'No se realizaron en fecha', 'Responsable ocupado en otras actividades', 'No hay suplente definido', 'Planificación no contempla suplencias'] }, conclusion: 'La planificación no contempla suplencias para revisión documental', createdById: managerId },
    { ncCode: 'NC-003', methodology: 'FIVE_WHY', analysisData: { whys: ['Inspectores no capacitados', 'No se programó capacitación', 'No se identificó necesidad', 'No se realizó análisis de competencias', 'Procedimiento no implementado completamente'] }, conclusion: 'El procedimiento de capacitación no se ha implementado completamente', createdById: patriciaId },
  ];
  for (const rca of rootCauseAnalyses) {
    const ncId = ncIds.get(rca.ncCode)!;
    const existing = await prisma.rootCauseAnalysis.findFirst({ where: { nonconformityId: ncId } });
    if (existing) {
      await prisma.rootCauseAnalysis.update({ where: { id: existing.id }, data: { methodology: rca.methodology, analysisData: rca.analysisData, conclusion: rca.conclusion, createdById: rca.createdById } });
    } else {
      await prisma.rootCauseAnalysis.create({ data: { organizationId: org.id, nonconformityId: ncId, methodology: rca.methodology, analysisData: rca.analysisData, conclusion: rca.conclusion, createdById: rca.createdById } });
    }
  }
  console.log(`Root Cause Analyses: ${rootCauseAnalyses.length} created/updated`);

  // 18. CORRECTIVE ACTIONS
  const correctiveActions = [
    { code: 'CA-001', ncCode: 'NC-001', description: 'Actualizar procedimiento de control documental para definir responsable de retirada', responsibleId: adminId, dueDate: '2026-03-15', completedAt: '2026-03-10T12:00:00Z', status: 'COMPLETED' },
    { code: 'CA-002', ncCode: 'NC-001', description: 'Implementar control de cambios para procedimientos del SGC', responsibleId: managerId, dueDate: '2026-04-01', completedAt: '2026-03-25T10:00:00Z', status: 'COMPLETED' },
    { code: 'CA-003', ncCode: 'NC-002', description: 'Establecer plan de revisiones documentales con suplencias definidas', responsibleId: adminId, dueDate: '2026-04-15', completedAt: null, status: 'IN_PROGRESS' },
    { code: 'CA-004', ncCode: 'NC-003', description: 'Implementar análisis de competencias y plan de capacitación para inspectores', responsibleId: patriciaId, dueDate: '2026-05-01', completedAt: '2026-04-20T14:00:00Z', status: 'COMPLETED' },
  ];
  const caIds = new Map<string, string>();
  for (const ca of correctiveActions) {
    const ncId = ncIds.get(ca.ncCode)!;
    const created = await prisma.correctiveAction.upsert({
      where: { organizationId_code: { organizationId: org.id, code: ca.code } },
      update: { description: ca.description, responsibleId: ca.responsibleId, dueDate: new Date(ca.dueDate), completedAt: ca.completedAt ? new Date(ca.completedAt) : null, status: ca.status, nonconformityId: ncId },
      create: { organizationId: org.id, code: ca.code, description: ca.description, responsibleId: ca.responsibleId, dueDate: new Date(ca.dueDate), completedAt: ca.completedAt ? new Date(ca.completedAt) : null, status: ca.status, nonconformityId: ncId },
    });
    caIds.set(ca.code, created.id);
  }
  console.log(`Corrective Actions: ${caIds.size} created/updated`);

  // 19. CORRECTIVE ACTION VERIFICATIONS
  const verifications = [
    { caCode: 'CA-001', verifierId: auditorId, effectivenessStatus: 'EFFECTIVE', evidence: 'Procedimiento actualizado y publicado', comments: 'Acción correctiva efectiva' },
    { caCode: 'CA-002', verifierId: auditorId, effectivenessStatus: 'EFFECTIVE', evidence: 'Control de cambios implementado', comments: 'Control de cambios operativo' },
    { caCode: 'CA-004', verifierId: jorgeId, effectivenessStatus: 'EFFECTIVE', evidence: 'Análisis de competencias realizado, inspectores capacitados', comments: 'Inspectores completaron capacitación' },
  ];
  for (const v of verifications) {
    const caId = caIds.get(v.caCode)!;
    const existing = await prisma.correctiveActionVerification.findFirst({ where: { correctiveActionId: caId, verifierId: v.verifierId } });
    if (existing) {
      await prisma.correctiveActionVerification.update({ where: { id: existing.id }, data: { effectivenessStatus: v.effectivenessStatus, evidence: v.evidence, comments: v.comments } });
    } else {
      await prisma.correctiveActionVerification.create({ data: { organizationId: org.id, correctiveActionId: caId, verifierId: v.verifierId, effectivenessStatus: v.effectivenessStatus, evidence: v.evidence, comments: v.comments } });
    }
  }
  console.log(`Verifications: ${verifications.length} created/updated`);

  // 20. RISKS
  const risks = [
    { code: 'RISK-001', title: 'Documentación desactualizada', description: 'Riesgo de que los documentos del SGC no se mantengan actualizados', riskType: 'OPERATIONAL', ownerId: adminId, status: 'ASSESSED', procCode: 'PROC-DOC' },
    { code: 'RISK-002', title: 'Falta de capacitación del personal', description: 'Riesgo de que el personal no tenga la capacitación requerida', riskType: 'HUMAN_RESOURCES', ownerId: patriciaId, status: 'TREATMENT_PLANNED', procCode: 'PROC-RRHH' },
    { code: 'RISK-003', title: 'Fallo en infraestructura tecnológica', description: 'Riesgo de fallo en sistemas de información del SGC', riskType: 'TECHNOLOGICAL', ownerId: jorgeId, status: 'UNDER_CONTROL', procCode: 'PROC-TI' },
    { code: 'RISK-004', title: 'Incumplimiento de requisitos del cliente', description: 'Riesgo de no cumplir requisitos de calidad del cliente', riskType: 'QUALITY', ownerId: managerId, status: 'ASSESSED', procCode: 'PROC-QMS' },
    { code: 'RISK-005', title: 'Interrupción de cadena de suministro', description: 'Riesgo de que proveedores no entreguen insumos a tiempo', riskType: 'EXTERNAL', ownerId: fernandoId, status: 'TREATMENT_PLANNED', procCode: 'PROC-PROD' },
  ];
  const riskIds = new Map<string, string>();
  for (const r of risks) {
    const processId = r.procCode ? procIds.get(r.procCode) : null;
    const created = await prisma.risk.upsert({
      where: { organizationId_code: { organizationId: org.id, code: r.code } },
      update: { title: r.title, description: r.description, riskType: r.riskType, ownerId: r.ownerId, status: r.status, processId: processId || undefined },
      create: { organizationId: org.id, code: r.code, title: r.title, description: r.description, riskType: r.riskType, ownerId: r.ownerId, status: r.status, processId: processId || undefined },
    });
    riskIds.set(r.code, created.id);
  }
  console.log(`Risks: ${riskIds.size} created/updated`);

  // 21. RISK ASSESSMENTS
  const riskAssessments = [
    { riskCode: 'RISK-001', probability: 'MEDIUM', impact: 'HIGH', score: 'HIGH', assessedById: adminId },
    { riskCode: 'RISK-002', probability: 'HIGH', impact: 'HIGH', score: 'CRITICAL', assessedById: patriciaId },
    { riskCode: 'RISK-003', probability: 'LOW', impact: 'CRITICAL', score: 'HIGH', assessedById: jorgeId },
    { riskCode: 'RISK-004', probability: 'MEDIUM', impact: 'HIGH', score: 'HIGH', assessedById: managerId },
    { riskCode: 'RISK-005', probability: 'MEDIUM', impact: 'MEDIUM', score: 'MEDIUM', assessedById: fernandoId },
  ];
  for (const ra of riskAssessments) {
    const riskId = riskIds.get(ra.riskCode)!;
    const existing = await prisma.riskAssessment.findFirst({ where: { riskId } });
    const pVal = ra.probability === 'LOW' ? 1 : ra.probability === 'MEDIUM' ? 2 : ra.probability === 'HIGH' ? 3 : 4;
    const iVal = ra.impact === 'LOW' ? 1 : ra.impact === 'MEDIUM' ? 2 : ra.impact === 'HIGH' ? 3 : 4;
    const calc = { probabilityValue: pVal, impactValue: iVal, scoreValue: pVal * iVal };
    if (existing) {
      await prisma.riskAssessment.update({ where: { id: existing.id }, data: { probability: ra.probability, impact: ra.impact, score: ra.score, calculationData: calc, assessedById: ra.assessedById } });
    } else {
      await prisma.riskAssessment.create({ data: { organizationId: org.id, riskId, probability: ra.probability, impact: ra.impact, score: ra.score, calculationData: calc, assessedById: ra.assessedById } });
    }
  }
  console.log(`Risk Assessments: ${riskAssessments.length} created/updated`);

  // 22. RISK CONTROLS
  const riskControls = [
    { riskCode: 'RISK-001', userId: adminId, description: 'Revisión trimestral de documentos del SGC', controlType: 'PREVENTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-001', userId: managerId, description: 'Alertas automáticas de vencimiento', controlType: 'DETECTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-002', userId: patriciaId, description: 'Plan anual de capacitación obligatorio', controlType: 'PREVENTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-002', userId: patriciaId, description: 'Evaluación de competencias semestral', controlType: 'DETECTIVE', effectiveness: 'PARTIAL' },
    { riskCode: 'RISK-003', userId: jorgeId, description: 'Respaldo diario de información', controlType: 'PREVENTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-003', userId: jorgeId, description: 'Monitoreo 24/7 de servidores', controlType: 'DETECTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-004', userId: managerId, description: 'Revisión de requisitos antes de aceptar pedidos', controlType: 'PREVENTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-004', userId: lauraId, description: 'Inspección de producto en proceso', controlType: 'DETECTIVE', effectiveness: 'EFFECTIVE' },
    { riskCode: 'RISK-005', userId: fernandoId, description: 'Mantenimiento de inventario de seguridad', controlType: 'PREVENTIVE', effectiveness: 'PARTIAL' },
    { riskCode: 'RISK-005', userId: fernandoId, description: 'Evaluación trimestral de proveedores', controlType: 'DETECTIVE', effectiveness: 'EFFECTIVE' },
  ];
  for (const rc of riskControls) {
    const riskId = riskIds.get(rc.riskCode)!;
    await prisma.riskControl.create({ data: { organizationId: org.id, riskId, userId: rc.userId, description: rc.description, controlType: rc.controlType, effectiveness: rc.effectiveness } }).catch(() => {});
  }
  console.log(`Risk Controls: ${riskControls.length} created/updated`);

  // 23. RISK TREATMENTS
  const riskTreatments = [
    { riskCode: 'RISK-001', strategy: 'MITIGATE', description: 'Implementar sistema de gestión documental con alertas automáticas', responsibleId: adminId, dueDate: '2026-06-30', status: 'IN_PROGRESS', completedAt: null },
    { riskCode: 'RISK-002', strategy: 'MITIGATE', description: 'Implementar programa de capacitación obligatoria con seguimiento', responsibleId: patriciaId, dueDate: '2026-05-31', status: 'IN_PROGRESS', completedAt: null },
    { riskCode: 'RISK-003', strategy: 'MITIGATE', description: 'Implementar plan de recuperación de desastres', responsibleId: jorgeId, dueDate: '2026-04-30', status: 'COMPLETED', completedAt: '2026-04-15T10:00:00Z' },
    { riskCode: 'RISK-004', strategy: 'MITIGATE', description: 'Establecer proceso formal de revisión de requisitos del cliente', responsibleId: managerId, dueDate: '2026-05-15', status: 'COMPLETED', completedAt: '2026-05-01T14:00:00Z' },
    { riskCode: 'RISK-005', strategy: 'TRANSFER', description: 'Contratar seguro de interrupción de suministro', responsibleId: fernandoId, dueDate: '2026-07-31', status: 'PLANNED', completedAt: null },
    { riskCode: 'RISK-005', strategy: 'MITIGATE', description: 'Establecer acuerdos con proveedores alternativos', responsibleId: fernandoId, dueDate: '2026-06-30', status: 'IN_PROGRESS', completedAt: null },
  ];
  for (const rt of riskTreatments) {
    const riskId = riskIds.get(rt.riskCode)!;
    await prisma.riskTreatment.create({ data: { organizationId: org.id, riskId, strategy: rt.strategy, description: rt.description, responsibleId: rt.responsibleId, dueDate: new Date(rt.dueDate), status: rt.status, completedAt: rt.completedAt ? new Date(rt.completedAt) : null } }).catch(() => {});
  }
  console.log(`Risk Treatments: ${riskTreatments.length} created/updated`);

  console.log('');
  console.log('========================================');
  console.log('Seed completed successfully.');
  console.log('========================================');
  console.log(`Organization: ISO Management Demo`);
  console.log(`Users: ${userIds.size} | Departments: ${deptIds.size} | Areas: ${areaIds.size} | Processes: ${procIds.size}`);
  console.log(`Documents: ${docIds.size} | Audit Programs: ${auditProgIds.size} | Audits: ${auditIds.size}`);
  console.log(`Findings: ${findingIds.size} | Nonconformities: ${ncIds.size} | Corrective Actions: ${caIds.size}`);
  console.log(`Risks: ${riskIds.size} | Risk Assessments: ${riskAssessments.length} | Controls: ${riskControls.length}`);
  console.log('========================================');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
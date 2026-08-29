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

async function main() {
  console.log('Tenant isolation test setup...');

  const orgA = await prisma.organization.findFirst({
    where: { name: 'ISO Management Demo' },
  });

  if (!orgA) {
    throw new Error('Organization ISO Management Demo not found. Run seed first.');
  }

  let orgB = await prisma.organization.findFirst({
    where: { name: 'ISO Management Tenant B' },
  });

  if (!orgB) {
    orgB = await prisma.organization.create({
      data: { name: 'ISO Management Tenant B', timezone: 'UTC', locale: 'es', isActive: true },
    });
    console.log(`Created organization B: ${orgB.name}`);
  } else {
    console.log(`Organization B exists: ${orgB.name}`);
  }

  const adminRoleA = await prisma.role.findFirst({
    where: { organizationId: orgA.id, name: 'ADMIN' },
  });
  let adminRoleB = await prisma.role.findFirst({
    where: { organizationId: orgB.id, name: 'ADMIN' },
  });

  if (!adminRoleA) {
    throw new Error('ADMIN role not found in organization A. Run seed first.');
  }

  if (!adminRoleB) {
    adminRoleB = await prisma.role.create({
      data: { organizationId: orgB.id, name: 'ADMIN', description: 'Full administrative access', isSystem: true, isActive: true },
    });
    console.log(`Created ADMIN role in organization B`);
  }

  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRoleB.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRoleB.id, permissionId: perm.id },
    });
  }
  console.log(`Assigned ${allPermissions.length} permissions to ADMIN role in organization B`);

  const userAEmail = 'admin-tenant-a@iso-management.local';
  const userBEmail = 'admin-tenant-b@iso-management.local';
  const sharedPassword = 'TenantTest123!';

  const userA = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgA.id, email: userAEmail } },
    update: { isActive: true },
    create: {
      organizationId: orgA.id,
      email: userAEmail,
      passwordHash: await hashPassword(sharedPassword),
      firstName: 'Admin',
      lastName: 'Tenant A',
      isActive: true,
    },
  });

  const userB = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: orgB.id, email: userBEmail } },
    update: { isActive: true },
    create: {
      organizationId: orgB.id,
      email: userBEmail,
      passwordHash: await hashPassword(sharedPassword),
      firstName: 'Admin',
      lastName: 'Tenant B',
      isActive: true,
    },
  });

  await prisma.userRole.deleteMany({ where: { userId: userA.id } });
  await prisma.userRole.deleteMany({ where: { userId: userB.id } });

  await prisma.userRole.create({ data: { userId: userA.id, roleId: adminRoleA.id, assignedBy: userA.id } });
  await prisma.userRole.create({ data: { userId: userB.id, roleId: adminRoleB.id, assignedBy: userB.id } });

  console.log(`Tenant A user: ${userAEmail}`);
  console.log(`Tenant B user: ${userBEmail}`);

  const deptA = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: orgA.id, name: 'Tenant A Department' } },
    update: {},
    create: { organizationId: orgA.id, name: 'Tenant A Department', isActive: true },
  });

  const deptB = await prisma.department.upsert({
    where: { organizationId_name: { organizationId: orgB.id, name: 'Tenant B Department' } },
    update: {},
    create: { organizationId: orgB.id, name: 'Tenant B Department', isActive: true },
  });

  console.log(`Tenant isolation test data ready.`);
  console.log(`Organization A: ${orgA.name} (${orgA.id})`);
  console.log(`Organization B: ${orgB.name} (${orgB.id})`);
  console.log(`Department A: ${deptA.id}`);
  console.log(`Department B: ${deptB.id}`);
}

main()
  .catch((e) => {
    console.error('Tenant isolation setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

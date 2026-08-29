import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UserRepository } from '../../auth/repositories/user.repository';
import { RoleRepository } from '../../auth/repositories/role.repository';
import { PermissionRepository } from '../../auth/repositories/permission.repository';
import { UserListItem, UserDetail, UserPermissions } from '../entities/user-management.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { PasswordService } from '../../auth/services/password.service';
import { ConcurrencyService } from '../../../common/services/concurrency.service';
import { AuditLogService } from '../../audit-logs/services/audit-log.service';
import { SecurityEventService } from '../../security-events/services/security-event.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
    private readonly passwordService: PasswordService,
    private readonly concurrencyService: ConcurrencyService,
    private readonly auditLogService: AuditLogService,
    private readonly securityEventService: SecurityEventService,
  ) {}

  private async recordAuditEvent(params: {
    organizationId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    correlationId?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.recordEvent({
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        correlationId: params.correlationId,
      });
    } catch {
      // Audit logging failure must not break business operations
    }
  }

  async listUsers(
    organizationId: string,
    page: number,
    pageSize: number,
    search?: string,
    roleId?: string,
    departmentId?: string,
    isActive?: boolean,
  ): Promise<{ data: UserListItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.roles = { some: { roleId } };
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          isActive: true,
          mfaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u) => new UserListItem(
      u.id,
      u.email,
      u.firstName,
      u.lastName,
      u.departmentId,
      u.department?.name ?? null,
      u.isActive,
      u.mfaEnabled,
      u.lastLoginAt,
      u.createdAt,
      u.updatedAt,
    ));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
  async createUser(organizationId: string, actorId: string, dto: CreateUserDto, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<UserDetail> {
    const existingUser = await this.userRepository.findByEmail(organizationId, dto.email);
    if (existingUser) {
      throw new ConflictException('DuplicateEmail');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        departmentId: dto.departmentId,
        mfaEnabled: dto.mfaEnabled,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (dto.roleIds.length > 0) {
      await this.assignRolesToUser(user.id, dto.roleIds, actorId);
    }

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      payload: { email: user.email },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return this.getUserDetail(organizationId, user.id);
  }

  async getUser(organizationId: string, userId: string): Promise<UserDetail> {
    return this.getUserDetail(organizationId, userId);
  }

  async updateUser(organizationId: string, userId: string, actorId: string, dto: UpdateUserDto, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<UserDetail> {
    const user = await this.userRepository.findById(userId, organizationId);
    if (!user) {
      throw new NotFoundException('UserNotFound');
    }

    this.concurrencyService.validateIfMatch(user, ifMatch);

    const updateData: Record<string, unknown> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: userId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return this.getUserDetail(organizationId, userId);
  }

  async activateUser(organizationId: string, userId: string, actorId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const user = await this.userRepository.findById(userId, organizationId);
    if (!user) {
      throw new NotFoundException('UserNotFound');
    }

    this.concurrencyService.validateIfMatch(user, ifMatch);

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, deletedAt: null },
    });

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'USER_ACTIVATED',
      entityType: 'User',
      entityId: userId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async deactivateUser(organizationId: string, userId: string, actorId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<void> {
    const user = await this.userRepository.findById(userId, organizationId);
    if (!user) {
      throw new NotFoundException('UserNotFound');
    }

    this.concurrencyService.validateIfMatch(user, ifMatch);

    const activeAdmins = await this.prisma.user.count({
      where: {
        organizationId,
        isActive: true,
        deletedAt: null,
        roles: {
          some: {
            role: {
              permissions: {
                some: {
                  permission: {
                    resource: 'users',
                    action: 'manage',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (activeAdmins <= 1) {
      throw new BadRequestException('CannotDeactivateLastAdmin');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: userId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });
  }

  async assignRoles(organizationId: string, userId: string, dto: AssignRolesDto, actorId: string, ifMatch?: string, ipAddress?: string | null, userAgent?: string | null, correlationId?: string): Promise<UserDetail> {
    const user = await this.userRepository.findById(userId, organizationId);
    if (!user) {
      throw new NotFoundException('UserNotFound');
    }

    this.concurrencyService.validateIfMatch(user, ifMatch);

    const roles = await this.roleRepository.findByOrganization(organizationId);
    const validRoleIds = new Set(roles.map((r) => r.id));

    const invalidRoles = dto.roleIds.filter((id) => !validRoleIds.has(id));
    if (invalidRoles.length > 0) {
      throw new ForbiddenException('InvalidRole');
    }

    await this.assignRolesToUser(userId, dto.roleIds, actorId);

    await this.recordAuditEvent({
      organizationId,
      actorId,
      action: 'ROLES_ASSIGNED',
      entityType: 'User',
      entityId: userId,
      payload: { roleIds: dto.roleIds },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      correlationId,
    });

    return this.getUserDetail(organizationId, userId);
  }

  async getUserPermissions(organizationId: string, userId: string): Promise<UserPermissions> {
    const user = await this.userRepository.findById(userId, organizationId);
    if (!user || user.organizationId !== organizationId) {
      throw new NotFoundException('UserNotFound');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, user: { isActive: true } },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissionMap = new Map<string, { resource: string; action: string; description?: string }>();

    for (const userRole of userRoles) {
      if (!userRole.role.isActive) continue;
      for (const rp of userRole.role.permissions) {
        const key = `${rp.permission.resource}:${rp.permission.action}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            resource: rp.permission.resource,
            action: rp.permission.action,
            description: rp.permission.description ?? undefined,
          });
        }
      }
    }

    return {
      permissions: Array.from(permissionMap.values()),
    };
  }

  private async assignRolesToUser(userId: string, roleIds: string[], actorId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId } });

    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
        assignedBy: actorId,
      })),
      skipDuplicates: true,
    });
  }

  private async getUserDetail(organizationId: string, userId: string): Promise<UserDetail> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          where: { role: { isActive: true } },
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('UserNotFound');
    }

    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      permissions: ur.role.permissions.map((rp) => ({
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    }));

    return new UserDetail(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      user.departmentId,
      user.department?.name ?? null,
      user.isActive,
      user.mfaEnabled,
      user.lastLoginAt,
      user.createdAt,
      user.updatedAt,
      roles,
    );
  }
}

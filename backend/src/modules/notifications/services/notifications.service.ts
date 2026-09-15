import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationItem } from '../entities/notification.entity';
import { UpdateNotificationDto as UpdateDto } from '../dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, organizationId: string, page: number = 1, pageSize: number = 25, unreadOnly?: boolean): Promise<{ data: NotificationItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const where: Record<string, unknown> = {
      organizationId,
      userId,
    };
    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async get(userId: string, organizationId: string, id: string): Promise<NotificationItem> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, organizationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('NotificationNotFound');
    }
    return notification;
  }

  async markAsRead(userId: string, organizationId: string, id: string): Promise<NotificationItem> {
    await this.get(userId, organizationId, id);
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        organizationId,
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  async create(userId: string, organizationId: string, dto: CreateNotificationDto): Promise<NotificationItem> {
    return this.prisma.notification.create({
      data: {
        organizationId,
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        entityType: dto.entityType || null,
        entityId: dto.entityId || null,
      },
    });
  }

  async update(userId: string, organizationId: string, id: string, dto: UpdateDto): Promise<NotificationItem> {
    await this.get(userId, organizationId, id);
    return this.prisma.notification.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.message !== undefined && { message: dto.message }),
        ...(dto.readAt !== undefined && { readAt: dto.readAt }),
      },
    });
  }

  async unreadCount(userId: string, organizationId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        organizationId,
        userId,
        readAt: null,
      },
    });
    return { count };
  }
}

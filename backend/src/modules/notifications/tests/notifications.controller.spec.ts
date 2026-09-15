import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../controllers/notifications.controller';
import { NotificationsService } from '../services/notifications.service';
import { PrismaService } from '../../../database/prisma.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { NotificationItem } from '../entities/notification.entity';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockPrisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  } as unknown as jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should list notifications with pagination', async () => {
      const notification = {
        id: 'notif-1', organizationId: 'org-1', userId: 'user-1',
        type: 'DOCUMENT_SUBMITTED', title: 'Test', message: 'Message',
        entityType: null, entityId: null, readAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma.notification.findMany.mockResolvedValue([notification]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await controller.list('user-1', 'org-1', '1', '25', undefined);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('notif-1');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('POST /notifications', () => {
    it('should create notification', async () => {
      const dto = new CreateNotificationDto();
      dto.type = 'DOCUMENT_SUBMITTED';
      dto.title = 'Test Title';
      dto.message = 'Test Message';

      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1', organizationId: 'org-1', userId: 'user-1',
        type: 'DOCUMENT_SUBMITTED', title: 'Test Title', message: 'Test Message',
        entityType: null, entityId: null, readAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      } as unknown as NotificationItem);

      const result = await controller.create('user-1', 'org-1', dto);
      expect(result.id).toBe('notif-1');
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1', organizationId: 'org-1', userId: 'user-1',
        type: 'TEST', title: 'T', message: 'M', entityType: null, entityId: null,
        readAt: null, createdAt: new Date(), updatedAt: new Date(),
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1', readAt: expect.any(Date),
      } as unknown as NotificationItem);

      const result = await controller.markAsRead('user-1', 'org-1', 'notif-1');
      expect(result.readAt).toBeDefined();
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all as read', async () => {
      await controller.markAllAsRead('user-1', 'org-1');
      expect(mockPrisma.notification.updateMany).toHaveBeenCalled();
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await controller.unreadCount('user-1', 'org-1');
      expect(result.count).toBe(5);
    });
  });

  describe('PATCH /notifications/:id', () => {
    it('should update notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1', organizationId: 'org-1', userId: 'user-1',
        type: 'TEST', title: 'T', message: 'M', entityType: null, entityId: null,
        readAt: null, createdAt: new Date(), updatedAt: new Date(),
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1', title: 'Updated',
      } as unknown as NotificationItem);

      const dto = new UpdateNotificationDto();
      dto.title = 'Updated';

      const result = await controller.update('user-1', 'org-1', 'notif-1', dto);
      expect(result.title).toBe('Updated');
    });
  });
});
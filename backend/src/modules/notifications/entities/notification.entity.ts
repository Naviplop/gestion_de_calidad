export interface NotificationItem {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
  user?: { id: string; firstName: string; lastName: string };
}

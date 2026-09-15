import { Body, Controller, Get, Param, Post, Patch, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from '../services/notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';

interface AuthenticatedRequest extends Request {
  organizationId: string;
  userId: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.list(
      req.userId,
      req.organizationId,
      parseInt(page || '1', 10),
      parseInt(pageSize || '25', 10),
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  unreadCount(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.unreadCount(req.userId, req.organizationId);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.get(req.userId, req.organizationId, id);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markAsRead(req.userId, req.organizationId, id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.userId, req.organizationId);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(req.userId, req.organizationId, dto);
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNotificationDto) {
    return this.notificationsService.update(req.userId, req.organizationId, id, dto);
  }
}

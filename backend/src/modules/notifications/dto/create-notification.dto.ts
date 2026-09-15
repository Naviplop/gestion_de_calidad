import { IsString, IsOptional, IsUUID, IsNotEmpty, IsEnum } from 'class-validator';

export enum NotificationType {
  DOCUMENT_SUBMITTED = 'DOCUMENT_SUBMITTED',
  DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
  DOCUMENT_PUBLISHED = 'DOCUMENT_PUBLISHED',
  NC_CREATED = 'NC_CREATED',
  NC_RESOLVED = 'NC_RESOLVED',
  AUDIT_SCHEDULED = 'AUDIT_SCHEDULED',
  AUDIT_COMPLETED = 'AUDIT_COMPLETED',
}

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  message?: string;

  @IsOptional()
  readAt?: Date | null;
}

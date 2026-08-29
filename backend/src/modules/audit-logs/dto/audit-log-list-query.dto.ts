import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class AuditLogListQuery {
  @IsOptional()
  @IsString()
  @Type(() => String)
  page?: string;

  @IsOptional()
  @IsString()
  @Type(() => String)
  pageSize?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

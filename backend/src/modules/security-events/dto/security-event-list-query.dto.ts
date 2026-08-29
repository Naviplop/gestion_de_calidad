import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class SecurityEventListQuery {
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
  eventType?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

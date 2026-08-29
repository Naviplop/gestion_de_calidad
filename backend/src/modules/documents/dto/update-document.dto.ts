import { IsString, MaxLength, IsOptional, IsDate, IsEnum, IsUUID } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUUID()
  processId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @IsEnum(['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'])
  classification?: string;

  @IsOptional()
  @IsEnum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'])
  confidentiality?: string;

  @IsOptional()
  @IsDate()
  nextReviewDate?: Date;

  @IsOptional()
  isActive?: boolean;
}

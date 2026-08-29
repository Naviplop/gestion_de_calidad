import { IsString, MaxLength, IsOptional, IsDate, IsEnum, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(100)
  code!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsUUID()
  documentTypeId!: string;

  @IsOptional()
  @IsUUID()
  processId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsUUID()
  ownerId!: string;

  @IsUUID()
  responsibleId!: string;

  @IsEnum(['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'])
  classification!: string;

  @IsEnum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'])
  confidentiality!: string;

  @IsOptional()
  @IsDate()
  issueDate?: Date;

  @IsOptional()
  @IsDate()
  reviewDate?: Date;

  @IsOptional()
  @IsDate()
  nextReviewDate?: Date;
}

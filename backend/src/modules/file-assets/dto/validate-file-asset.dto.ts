import { IsString, IsNotEmpty, IsUUID, IsIn, IsOptional, IsObject } from 'class-validator';

export class ValidateFileAssetDto {
  @IsString()
  @IsNotEmpty()
  bucketName!: string;

  @IsString()
  @IsNotEmpty()
  objectKey!: string;

  @IsString()
  @IsNotEmpty()
  originalFilename!: string;

  @IsString()
  @IsIn(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  mimeType!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  sha256Hash!: string;

  @IsOptional()
  @IsUUID()
  fileAssetId?: string;
}

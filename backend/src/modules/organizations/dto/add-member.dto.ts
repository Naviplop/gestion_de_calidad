import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AddMemberDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[] = [];
}

import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class WorkspaceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name!: string;
  @IsUrl()
  @IsString()
  imageUrl?: string;
}

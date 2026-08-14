import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

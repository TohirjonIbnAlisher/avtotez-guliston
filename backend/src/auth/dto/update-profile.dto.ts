import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value))
  @IsString()
  @MinLength(2, { message: "Ism kamida 2 ta harfdan iborat bo'lishi kerak." })
  @MaxLength(60, { message: "Ism 60 ta belgidan oshmasligi kerak." })
  fullName: string;
}

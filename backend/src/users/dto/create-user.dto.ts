import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { PHONE_PATTERN, PHONE_PATTERN_MESSAGE } from '../phone.util';

export class CreateUserDto {
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_PATTERN_MESSAGE })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

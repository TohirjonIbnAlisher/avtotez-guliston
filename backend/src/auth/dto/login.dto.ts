import { IsString, Matches, MinLength } from 'class-validator';
import { PHONE_PATTERN, PHONE_PATTERN_MESSAGE } from '../../users/phone.util';

export class LoginDto {
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_PATTERN_MESSAGE })
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}

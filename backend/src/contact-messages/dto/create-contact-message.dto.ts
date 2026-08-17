import { IsString, Matches, MinLength } from 'class-validator';
import { PHONE_PATTERN, PHONE_PATTERN_MESSAGE } from '../../users/phone.util';

export class CreateContactMessageDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_PATTERN_MESSAGE })
  phone: string;

  @IsString()
  @MinLength(3)
  message: string;
}

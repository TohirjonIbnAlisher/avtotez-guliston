import { IsEnum } from 'class-validator';
import { ContactMessageStatus } from '../entities/contact-message.entity';

export class UpdateContactMessageStatusDto {
  @IsEnum(ContactMessageStatus)
  status: ContactMessageStatus;
}

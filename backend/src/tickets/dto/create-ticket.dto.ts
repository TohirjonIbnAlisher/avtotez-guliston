import { ArrayMinSize, IsArray, IsInt, IsUUID, Min } from 'class-validator';

export class CreateTicketDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  questionIds: string[];
}

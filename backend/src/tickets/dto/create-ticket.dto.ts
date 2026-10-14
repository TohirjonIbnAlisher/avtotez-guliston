import { ArrayMaxSize, IsArray, IsInt, IsUUID, Min } from 'class-validator';

export class CreateTicketDto {
  @IsInt()
  @Min(1)
  number: number;

  /** Biletdagi savollar tartib bilan (bo'sh bo'lishi mumkin — keyin biriktiriladi). */
  @IsArray()
  @ArrayMaxSize(20, { message: "Biletda ko'pi bilan 20 ta savol bo'lishi mumkin." })
  @IsUUID('4', { each: true })
  questionIds: string[];
}

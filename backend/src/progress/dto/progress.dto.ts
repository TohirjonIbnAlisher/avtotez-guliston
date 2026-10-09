import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Bir martalik import'da qabul qilinadigan maksimal hajmlar (frontend'dagi eski localStorage limitlari bilan mos).
const MAX_QUESTIONS = 5000;
const MAX_HISTORY = 4000;
const MAX_SESSIONS = 200;
const MAX_TICKETS = 500;
const MAX_DAYS = 3660;

export class RecordAnswerDto {
  @IsUUID()
  questionId: string;

  @IsInt()
  @Min(0)
  @Max(20)
  selectedOption: number;
}

export class SetSavedDto {
  @IsBoolean()
  saved: boolean;
}

export class TicketResultDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  correct: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  wrong: number;
}

export class CreateTestSessionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  correct: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  wrong: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  total: number;
}

class ImportMistakeDto {
  @IsUUID()
  questionId: string;

  @IsInt()
  @Min(0)
  @Max(20)
  selectedOption: number;
}

class ImportTicketStatDto extends TicketResultDto {
  @IsInt()
  @Min(1)
  @Max(10000)
  ticketNumber: number;
}

class ImportAnswerEventDto {
  @IsUUID()
  questionId: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsInt()
  @Min(0)
  timestamp: number;
}

export class ImportProgressDto {
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @IsUUID('all', { each: true })
  correctIds: string[];

  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => ImportMistakeDto)
  mistakes: ImportMistakeDto[];

  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS)
  @IsUUID('all', { each: true })
  savedIds: string[];

  @IsArray()
  @ArrayMaxSize(MAX_TICKETS)
  @ValidateNested({ each: true })
  @Type(() => ImportTicketStatDto)
  ticketStats: ImportTicketStatDto[];

  @IsArray()
  @ArrayMaxSize(MAX_HISTORY)
  @ValidateNested({ each: true })
  @Type(() => ImportAnswerEventDto)
  history: ImportAnswerEventDto[];
}

class ImportTestSessionDto extends CreateTestSessionDto {
  @IsInt()
  @Min(0)
  timestamp: number;
}

export class ImportTestSessionsDto {
  @IsArray()
  @ArrayMaxSize(MAX_SESSIONS)
  @ValidateNested({ each: true })
  @Type(() => ImportTestSessionDto)
  sessions: ImportTestSessionDto[];
}

export class ImportActivityDaysDto {
  @IsArray()
  @ArrayMaxSize(MAX_DAYS)
  @Matches(DAY_PATTERN, { each: true })
  days: string[];
}

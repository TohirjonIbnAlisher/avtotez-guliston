import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import type { TopicTexts } from '../entities/topic.entity';

export class CreateTopicDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  /** Qo'lda tuzatilgan tarjimalar (ixtiyoriy) — bo'sh maydonlar avtomatik to'ldiriladi. */
  @IsOptional()
  @IsObject()
  translations?: Partial<Record<'uzk' | 'ru', Partial<TopicTexts>>>;
}

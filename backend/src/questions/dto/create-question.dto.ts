import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type {
  LocalizedExplanation,
  LocalizedOptions,
  LocalizedText,
} from '../locale';

export class CreateQuestionDto {
  @IsObject()
  text: LocalizedText;

  @IsObject()
  options: LocalizedOptions;

  @IsInt()
  @Min(0)
  correctOptionIndex: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  explanation?: LocalizedExplanation;

  @IsOptional()
  @IsBoolean()
  isTricky?: boolean;

  @IsOptional()
  @IsBoolean()
  isNumberRelated?: boolean;

  @IsOptional()
  @IsUUID()
  topicId?: string;
}

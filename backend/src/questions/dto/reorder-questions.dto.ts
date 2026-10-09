import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class ReorderQuestionsDto {
  @IsUUID()
  topicId: string;

  /** Mavzudagi barcha savollar id'lari — yangi tartibda. */
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  questionIds: string[];
}

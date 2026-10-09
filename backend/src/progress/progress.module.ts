import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { Question } from '../questions/entities/question.entity';
import { QuestionProgress } from './entities/question-progress.entity';
import { AnswerEvent } from './entities/answer-event.entity';
import { TicketResult } from './entities/ticket-result.entity';
import { TestSession } from './entities/test-session.entity';
import { ActivityDay } from './entities/activity-day.entity';
import { AuthGuardsModule } from '../auth/auth-guards.module';

export const PROGRESS_ENTITIES = [QuestionProgress, AnswerEvent, TicketResult, TestSession, ActivityDay];

@Module({
  imports: [TypeOrmModule.forFeature([Question, ...PROGRESS_ENTITIES]), AuthGuardsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}

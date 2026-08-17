import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question } from './entities/question.entity';
import { Topic } from '../topics/entities/topic.entity';
import { AuthGuardsModule } from '../auth/auth-guards.module';

@Module({
  imports: [TypeOrmModule.forFeature([Question, Topic]), AuthGuardsModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

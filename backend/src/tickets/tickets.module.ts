import { AuthGuardsModule } from '../auth/auth-guards.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from './entities/ticket.entity';
import { Question } from '../questions/entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Question]), AuthGuardsModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Question } from '../questions/entities/question.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const questions = await this.getQuestionsOrThrow(dto.questionIds);
    const ticket = this.ticketsRepository.create({
      number: dto.number,
      questions,
    });
    return this.ticketsRepository.save(ticket);
  }

  findAll(): Promise<Ticket[]> {
    return this.ticketsRepository.find({
      relations: { questions: true },
      order: { number: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: { questions: true },
    });
    if (!ticket) {
      throw new NotFoundException(`Bilet topilmadi: ${id}`);
    }
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findOne(id);
    const { questionIds, ...rest } = dto;
    const questions = questionIds
      ? await this.getQuestionsOrThrow(questionIds)
      : ticket.questions;

    Object.assign(ticket, rest, { questions });
    return this.ticketsRepository.save(ticket);
  }

  async remove(id: string): Promise<void> {
    const result = await this.ticketsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Bilet topilmadi: ${id}`);
    }
  }

  private async getQuestionsOrThrow(ids: string[]): Promise<Question[]> {
    const questions = await this.questionsRepository.find({
      where: { id: In(ids) },
    });
    if (questions.length !== ids.length) {
      throw new NotFoundException('Ba\'zi savollar topilmadi');
    }
    return questions;
  }
}

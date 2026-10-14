import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { Question } from '../questions/entities/question.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { DEFAULT_LOCALE, Locale } from '../questions/locale';
import { resolveQuestion } from '../questions/resolve-question';

function sortQuestionsBySourceId(ticket: Ticket): Ticket {
  const pos = new Map((ticket.questionOrder ?? []).map((id, i) => [id, i]));
  ticket.questions = [...ticket.questions].sort(
    (a, b) =>
      (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity) || (a.sourceId ?? 0) - (b.sourceId ?? 0),
  );
  return ticket;
}

export interface ResolvedTicket {
  id: string;
  number: number;
  questions: ReturnType<typeof resolveQuestion>[];
}

function resolveTicket(ticket: Ticket, lang: Locale): ResolvedTicket {
  return {
    id: ticket.id,
    number: ticket.number,
    // nofaol savollar biletda ko'rsatilmaydi
    questions: ticket.questions.filter((q) => q.isActive).map((question) => resolveQuestion(question, lang)),
  };
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  async create(dto: CreateTicketDto): Promise<Ticket> {
    await this.assertNumberFree(dto.number);
    const questions = await this.getQuestionsOrThrow(dto.questionIds);
    const ticket = this.ticketsRepository.create({
      number: dto.number,
      questions,
      questionOrder: dto.questionIds,
    });
    return this.ticketsRepository.save(ticket);
  }

  // ---------- Admin panel ----------

  /** Barcha biletlar (faol savoli yo'qlari ham) — faol savollar soni bilan. */
  async adminList(): Promise<{ id: string; number: number; questionCount: number }[]> {
    const rows: { id: string; number: number; question_count: string }[] = await this.ticketsRepository
      .createQueryBuilder('t')
      .leftJoin('t.questions', 'q', 'q.isActive = true')
      .select('t.id', 'id')
      .addSelect('t.number', 'number')
      .addSelect('COUNT(q.id)', 'question_count')
      .groupBy('t.id')
      .orderBy('t.number', 'ASC')
      .getRawMany();
    return rows.map((r) => ({ id: r.id, number: Number(r.number), questionCount: Number(r.question_count) }));
  }

  /** Tahrirlash uchun bitta bilet (faol savollari tartib bilan). */
  async adminFindOne(id: string, lang: Locale = DEFAULT_LOCALE): Promise<ResolvedTicket> {
    return resolveTicket(sortQuestionsBySourceId(await this.findEntityOrThrow(id)), lang);
  }

  private async assertNumberFree(number: number, exceptId?: string): Promise<void> {
    const existing = await this.ticketsRepository.findOne({ where: { number } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`${number}-bilet allaqachon mavjud.`);
    }
  }

  async findAll(lang: Locale = DEFAULT_LOCALE): Promise<ResolvedTicket[]> {
    const tickets = await this.ticketsRepository.find({
      relations: { questions: true },
      order: { number: 'ASC' },
    });
    return tickets
      .filter((ticket) => ticket.questions.some((q) => q.isActive))
      .map((ticket) => resolveTicket(sortQuestionsBySourceId(ticket), lang));
  }

  async summary(): Promise<{ id: string; number: number; questionCount: number }[]> {
    const rows: { id: string; number: number; question_count: string }[] = await this.ticketsRepository
      .createQueryBuilder('t')
      .leftJoin('t.questions', 'q', 'q.isActive = true')
      .select('t.id', 'id')
      .addSelect('t.number', 'number')
      .addSelect('COUNT(q.id)', 'question_count')
      .groupBy('t.id')
      .having('COUNT(q.id) > 0') // faol savoli qolmagan biletlar ro'yxatda ko'rinmaydi
      .orderBy('t.number', 'ASC')
      .getRawMany();
    return rows.map((r) => ({ id: r.id, number: Number(r.number), questionCount: Number(r.question_count) }));
  }

  async findByNumber(number: number, lang: Locale = DEFAULT_LOCALE): Promise<ResolvedTicket> {
    const ticket = await this.ticketsRepository.findOne({ where: { number }, relations: { questions: true } });
    if (!ticket || !ticket.questions.some((q) => q.isActive)) {
      throw new NotFoundException(`Bilet topilmadi: ${number}`);
    }
    return resolveTicket(sortQuestionsBySourceId(ticket), lang);
  }

  async findOne(id: string, lang: Locale = DEFAULT_LOCALE): Promise<ResolvedTicket> {
    const ticket = await this.findEntityOrThrow(id);
    return resolveTicket(sortQuestionsBySourceId(ticket), lang);
  }

  private async findEntityOrThrow(id: string): Promise<Ticket> {
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
    const ticket = await this.findEntityOrThrow(id);
    const { questionIds, number } = dto;
    if (number !== undefined && number !== ticket.number) {
      await this.assertNumberFree(number, ticket.id);
      ticket.number = number;
    }
    if (questionIds) {
      // Admin panelda nofaol savollar ko'rinmaydi — ular biletdan tushib qolmasligi uchun saqlab qolinadi.
      const kept = sortQuestionsBySourceId(ticket).questions.filter((q) => !q.isActive && !questionIds.includes(q.id));
      const questions = await this.getQuestionsOrThrow(questionIds);
      ticket.questions = [...questions, ...kept];
      ticket.questionOrder = [...questionIds, ...kept.map((q) => q.id)];
    }
    return this.ticketsRepository.save(ticket);
  }

  async remove(id: string): Promise<void> {
    const result = await this.ticketsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Bilet topilmadi: ${id}`);
    }
  }

  private async getQuestionsOrThrow(ids: string[]): Promise<Question[]> {
    if (!ids.length) {
      return [];
    }
    const questions = await this.questionsRepository.find({
      where: { id: In(ids) },
    });
    if (questions.length !== ids.length) {
      throw new NotFoundException('Ba\'zi savollar topilmadi');
    }
    return questions;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { Topic } from '../topics/entities/topic.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DEFAULT_LOCALE, Locale } from './locale';
import { resolveQuestion, ResolvedQuestion } from './resolve-question';
import { makeRoomAt, renumberTopicOrder } from './topic-order';

interface FindQuestionsOptions {
  topicId?: string;
  isTricky?: boolean;
  isNumberRelated?: boolean;
}

export type { ResolvedQuestion };

@Injectable()
export class QuestionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
  ) {}

  async create(dto: CreateQuestionDto): Promise<Question> {
    const topic = dto.topicId ? await this.getTopicOrThrow(dto.topicId) : null;

    return this.dataSource.transaction(async (manager) => {
      if (topic && dto.topicOrder) {
        await makeRoomAt(manager, topic.id, dto.topicOrder);
      }
      const saved = await manager.save(
        manager.create(Question, {
          text: dto.text,
          options: dto.options,
          correctOptionIndex: dto.correctOptionIndex,
          imageUrl: dto.imageUrl ?? null,
          explanation: dto.explanation ?? null,
          isTricky: dto.isTricky ?? false,
          isNumberRelated: dto.isNumberRelated ?? false,
          topic,
          // o'rni berilmasa (null) — renumber uni mavzu oxiriga qo'yadi
          topicOrder: topic ? (dto.topicOrder ?? null) : null,
        }),
      );
      await renumberTopicOrder(manager, [topic?.id ?? null]);
      return this.reload(manager, saved.id);
    });
  }

  async findAll(
    options: FindQuestionsOptions = {},
    lang: Locale = DEFAULT_LOCALE,
  ): Promise<ResolvedQuestion[]> {
    const questions = await this.questionsRepository.find({
      where: {
        ...(options.topicId && { topic: { id: options.topicId } }),
        ...(options.isTricky !== undefined && { isTricky: options.isTricky }),
        ...(options.isNumberRelated !== undefined && {
          isNumberRelated: options.isNumberRelated,
        }),
      },
      relations: { topic: true },
      order: { topicOrder: { direction: 'ASC', nulls: 'LAST' }, sourceId: { direction: 'ASC', nulls: 'LAST' } },
    });
    return questions.map((question) => this.resolve(question, lang));
  }

  // imtihonni simulyatsiya qilish uchun tasodifiy 20 ta savol
  async findRandom(
    count = 20,
    lang: Locale = DEFAULT_LOCALE,
  ): Promise<ResolvedQuestion[]> {
    const questions = await this.questionsRepository
      .createQueryBuilder('question')
      .orderBy('RANDOM()')
      .limit(count)
      .getMany();
    return questions.map((question) => this.resolve(question, lang));
  }

  async findOne(
    id: string,
    lang: Locale = DEFAULT_LOCALE,
  ): Promise<ResolvedQuestion> {
    const question = await this.findEntityOrThrow(id);
    return this.resolve(question, lang);
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<Question> {
    const question = await this.findEntityOrThrow(id);
    const { topicId, topicOrder, ...rest } = dto;
    const oldTopicId = question.topic?.id ?? null;
    const topic =
      topicId === undefined ? question.topic : topicId === null ? null : await this.getTopicOrThrow(topicId);
    const newTopicId = topic?.id ?? null;
    const moving = newTopicId !== oldTopicId || (topicOrder !== undefined && topicOrder !== question.topicOrder);

    return this.dataSource.transaction(async (manager) => {
      Object.assign(question, rest, { topic });
      if (!moving) {
        await manager.save(question);
        return this.reload(manager, id);
      }
      // Avval eski o'rnidan chiqariladi (bo'shliq yopiladi), keyin yangi o'ringa qo'yiladi.
      question.topicOrder = null;
      await manager.save(question);
      await renumberTopicOrder(manager, [oldTopicId, newTopicId]);
      if (newTopicId) {
        // mavzu o'zgarib, o'rni ko'rsatilmasa — oxiriga
        const position = topicOrder ?? null;
        if (position) {
          await makeRoomAt(manager, newTopicId, position);
        }
        await manager.update(Question, { id }, { topicOrder: position });
        await renumberTopicOrder(manager, [newTopicId]);
      }
      return this.reload(manager, id);
    });
  }

  /** Mavzudagi savollar tartibini to'liq almashtirish (admin panelidan). */
  async reorder(topicId: string, questionIds: string[]): Promise<void> {
    await this.getTopicOrThrow(topicId);
    await this.dataSource.transaction(async (manager) => {
      const rows: { id: string }[] = await manager.query(
        `SELECT "id" FROM "questions" WHERE "topic_id" = $1`,
        [topicId],
      );
      const current = new Set(rows.map((r) => r.id));
      const given = new Set(questionIds);
      if (given.size !== questionIds.length || given.size !== current.size || [...given].some((id) => !current.has(id))) {
        throw new BadRequestException("Ro'yxat mavzudagi savollar bilan mos emas — sahifani yangilab, qayta urinib ko'ring.");
      }
      await manager.query(
        `UPDATE "questions" q SET "topic_order" = t.pos
         FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, pos)
         WHERE q."id" = t.id`,
        [questionIds],
      );
    });
  }

  async remove(id: string): Promise<void> {
    const question = await this.findEntityOrThrow(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Question, { id });
      await renumberTopicOrder(manager, [question.topic?.id ?? null]);
    });
  }

  private async reload(manager: EntityManager, id: string): Promise<Question> {
    return manager.findOneOrFail(Question, { where: { id }, relations: { topic: true } });
  }

  private async findEntityOrThrow(id: string): Promise<Question> {
    const question = await this.questionsRepository.findOne({
      where: { id },
      relations: { topic: true },
    });
    if (!question) {
      throw new NotFoundException(`Savol topilmadi: ${id}`);
    }
    return question;
  }

  private resolve(question: Question, lang: Locale): ResolvedQuestion {
    return resolveQuestion(question, lang);
  }

  private async getTopicOrThrow(topicId: string): Promise<Topic> {
    const topic = await this.topicsRepository.findOne({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Mavzu topilmadi: ${topicId}`);
    }
    return topic;
  }
}

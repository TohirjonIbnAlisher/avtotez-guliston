import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { Topic } from '../topics/entities/topic.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DEFAULT_LOCALE, Locale } from './locale';

interface FindQuestionsOptions {
  topicId?: string;
  isTricky?: boolean;
  isNumberRelated?: boolean;
}

export interface ResolvedQuestion {
  id: string;
  sourceId: number | null;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageUrl: string | null;
  explanation: string | null;
  isTricky: boolean;
  isNumberRelated: boolean;
  topic: Topic | null;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
  ) {}

  async create(dto: CreateQuestionDto): Promise<Question> {
    const topic = dto.topicId
      ? await this.getTopicOrThrow(dto.topicId)
      : null;

    const question = this.questionsRepository.create({
      text: dto.text,
      options: dto.options,
      correctOptionIndex: dto.correctOptionIndex,
      imageUrl: dto.imageUrl ?? null,
      explanation: dto.explanation ?? null,
      isTricky: dto.isTricky ?? false,
      isNumberRelated: dto.isNumberRelated ?? false,
      topic,
    });

    return this.questionsRepository.save(question);
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
    const { topicId, ...rest } = dto;
    const topic = topicId !== undefined
      ? await this.getTopicOrThrow(topicId)
      : question.topic;

    Object.assign(question, rest, { topic });

    return this.questionsRepository.save(question);
  }

  async remove(id: string): Promise<void> {
    const result = await this.questionsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Savol topilmadi: ${id}`);
    }
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
    const fallback = DEFAULT_LOCALE;
    return {
      id: question.id,
      sourceId: question.sourceId,
      text: question.text[lang] ?? question.text[fallback],
      options: question.options[lang] ?? question.options[fallback],
      correctOptionIndex: question.correctOptionIndex,
      imageUrl: question.imageUrl,
      explanation:
        question.explanation?.[lang] ?? question.explanation?.[fallback] ?? null,
      isTricky: question.isTricky,
      isNumberRelated: question.isNumberRelated,
      topic: question.topic,
    };
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Locale } from '../questions/locale';
import { buildTopicTranslations, localizeTopic, mergeTopicTranslations } from './localize-topic';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
  ) {}

  async create(dto: CreateTopicDto): Promise<Topic> {
    const raw = await this.topicsRepository
      .createQueryBuilder('topic')
      .select('MAX(topic.sortOrder)', 'maxSortOrder')
      .getRawOne<{ maxSortOrder: number | null }>();

    const { translations: manual, ...fields } = dto;
    const topic = this.topicsRepository.create({ ...fields, sortOrder: (raw?.maxSortOrder ?? 0) + 1 });
    // admin faqat o'zbekcha kiritadi — kirillcha va ruscha avtomatik (qo'lda tuzatilganlari ustun)
    topic.translations = mergeTopicTranslations(await buildTopicTranslations(topic), manual);
    return this.topicsRepository.save(topic);
  }

  /** Til berilsa — shu tilda; berilmasa — asl (o'zbekcha) ko'rinishi tarjimalari bilan (admin panel uchun). */
  async findAll(lang?: Locale): Promise<Topic[]> {
    const topics = await this.topicsRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    return lang ? topics.map((topic) => localizeTopic(topic, lang)) : topics;
  }

  async findOne(id: string): Promise<Topic> {
    const topic = await this.topicsRepository.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException(`Mavzu topilmadi: ${id}`);
    }
    return topic;
  }

  async update(id: string, dto: UpdateTopicDto): Promise<Topic> {
    const topic = await this.findOne(id);
    const { translations: manual, ...fields } = dto;
    const before = JSON.stringify([topic.name, topic.description, topic.category]);
    Object.assign(topic, fields);
    const after = JSON.stringify([topic.name, topic.description, topic.category]);
    // o'zbekchasi o'zgarsa — tarjimalar qayta yaratiladi
    if (after !== before || !topic.translations) {
      topic.translations = await buildTopicTranslations(topic);
    }
    topic.translations = mergeTopicTranslations(topic.translations, manual);
    return this.topicsRepository.save(topic);
  }

  async remove(id: string): Promise<void> {
    const result = await this.topicsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Mavzu topilmadi: ${id}`);
    }
  }
}

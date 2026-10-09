import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

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

    return this.topicsRepository.save(
      this.topicsRepository.create({ ...dto, sortOrder: (raw?.maxSortOrder ?? 0) + 1 }),
    );
  }

  findAll(): Promise<Topic[]> {
    return this.topicsRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
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
    Object.assign(topic, dto);
    return this.topicsRepository.save(topic);
  }

  async remove(id: string): Promise<void> {
    const result = await this.topicsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Mavzu topilmadi: ${id}`);
    }
  }
}

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

  create(dto: CreateTopicDto): Promise<Topic> {
    return this.topicsRepository.save(this.topicsRepository.create(dto));
  }

  findAll(): Promise<Topic[]> {
    return this.topicsRepository.find();
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

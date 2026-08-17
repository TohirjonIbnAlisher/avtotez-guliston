import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageStatusDto } from './dto/update-status.dto';

@Injectable()
export class ContactMessagesService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly repository: Repository<ContactMessage>,
  ) {}

  create(dto: CreateContactMessageDto): Promise<ContactMessage> {
    return this.repository.save(this.repository.create(dto));
  }

  findAll(): Promise<ContactMessage[]> {
    return this.repository.find({ order: { createdAt: 'DESC' } });
  }

  async updateStatus(id: string, dto: UpdateContactMessageStatusDto): Promise<ContactMessage> {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Xabar topilmadi: ${id}`);
    }
    record.status = dto.status;
    return this.repository.save(record);
  }
}

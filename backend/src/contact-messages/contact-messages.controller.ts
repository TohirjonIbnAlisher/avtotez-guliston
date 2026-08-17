import { Body, Controller, Get, Param, Patch, Post, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageStatusDto } from './dto/update-status.dto';
import { StaffGuard } from '../auth/staff.guard';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  // Sayt tashrif buyuruvchilari uchun ochiq — login talab qilinmaydi.
  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(StaffGuard)
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactMessageStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }
}

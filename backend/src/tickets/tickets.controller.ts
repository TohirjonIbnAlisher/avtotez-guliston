import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { DEFAULT_LOCALE, isLocale, Locale } from '../questions/locale';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Get()
  findAll(@Query('lang') lang?: string) {
    return this.ticketsService.findAll(this.parseLocale(lang));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Query('lang') lang?: string) {
    return this.ticketsService.findOne(id, this.parseLocale(lang));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.remove(id);
  }

  private parseLocale(lang?: string): Locale {
    if (!lang) {
      return DEFAULT_LOCALE;
    }
    if (!isLocale(lang)) {
      throw new BadRequestException(
        `Noto'g'ri til kodi: ${lang}. Ruxsat etilgan: uz, uzk, ru`,
      );
    }
    return lang;
  }
}

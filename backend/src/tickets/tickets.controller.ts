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
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminGuard } from '../auth/superadmin.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { DEFAULT_LOCALE, isLocale, Locale } from '../questions/locale';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Get()
  findAll(@Query('lang') lang?: string) {
    return this.ticketsService.findAll(this.parseLocale(lang));
  }

  // Ro'yxat uchun yengil javob: faqat raqam va savollar soni (savollarsiz).
  @Get('summary')
  summary() {
    return this.ticketsService.summary();
  }

  // Bitta bilet raqami bo'yicha — bilet sahifasi faqat o'ziga keraklisini yuklaydi.
  @Get('number/:number')
  findByNumber(@Param('number', ParseIntPipe) number: number, @Query('lang') lang?: string) {
    return this.ticketsService.findByNumber(number, this.parseLocale(lang));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Query('lang') lang?: string) {
    return this.ticketsService.findOne(id, this.parseLocale(lang));
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
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

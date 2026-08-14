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
  ParseBoolPipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DEFAULT_LOCALE, isLocale, Locale } from './locale';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get()
  findAll(
    @Query('topicId') topicId?: string,
    @Query('isTricky', new ParseBoolPipe({ optional: true })) isTricky?: boolean,
    @Query('isNumberRelated', new ParseBoolPipe({ optional: true }))
    isNumberRelated?: boolean,
    @Query('lang') lang?: string,
  ) {
    return this.questionsService.findAll(
      { topicId, isTricky, isNumberRelated },
      this.parseLocale(lang),
    );
  }

  // imtihonni simulyatsiya qilish: /questions/random?count=20&lang=uz
  @Get('random')
  findRandom(
    @Query('count', new ParseIntPipe({ optional: true })) count?: number,
    @Query('lang') lang?: string,
  ) {
    return this.questionsService.findRandom(count, this.parseLocale(lang));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Query('lang') lang?: string) {
    return this.questionsService.findOne(id, this.parseLocale(lang));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.questionsService.remove(id);
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

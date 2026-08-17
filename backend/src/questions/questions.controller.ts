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
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { DEFAULT_LOCALE, isLocale, Locale } from './locale';
import { SuperAdminGuard } from '../auth/superadmin.guard';

const IMAGE_MIME_PATTERN = /^image\/(png|jpe?g|webp|gif)$/;

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Post('upload-image')
  @UseGuards(SuperAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'public', 'questions'),
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!IMAGE_MIME_PATTERN.test(file.mimetype)) {
          callback(new BadRequestException('Faqat rasm fayllari ruxsat etiladi.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Fayl yuborilmadi.');
    }
    return { imageUrl: `/media/questions/${file.filename}` };
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
  @UseGuards(SuperAdminGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
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

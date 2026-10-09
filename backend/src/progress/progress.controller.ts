import {
  Body,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';
import {
  CreateTestSessionDto,
  ImportActivityDaysDto,
  ImportProgressDto,
  ImportTestSessionsDto,
  RecordAnswerDto,
  SetSavedDto,
  TicketResultDto,
} from './dto/progress.dto';

// Foydalanuvchi id'si faqat JWT'dan olinadi — so'rov tanasidan emas.
const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
  return request.user.sub;
});

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly service: ProgressService) {}

  @Get()
  getState(@UserId() userId: string) {
    return this.service.getState(userId);
  }

  @Delete()
  @HttpCode(204)
  reset(@UserId() userId: string) {
    return this.service.resetProgress(userId);
  }

  @Post('answers')
  recordAnswer(@UserId() userId: string, @Body() dto: RecordAnswerDto) {
    return this.service.recordAnswer(userId, dto.questionId, dto.selectedOption);
  }

  @Put('saved/:questionId')
  @HttpCode(204)
  setSaved(
    @UserId() userId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: SetSavedDto,
  ) {
    return this.service.setSaved(userId, questionId, dto.saved);
  }

  @Put('tickets/:number')
  @HttpCode(204)
  setTicketResult(
    @UserId() userId: string,
    @Param('number', ParseIntPipe) ticketNumber: number,
    @Body() dto: TicketResultDto,
  ) {
    return this.service.setTicketResult(userId, ticketNumber, dto);
  }

  @Delete('tickets')
  @HttpCode(204)
  clearTicketResults(@UserId() userId: string) {
    return this.service.clearTicketResults(userId);
  }

  @Post('import')
  @HttpCode(204)
  importProgress(@UserId() userId: string, @Body() dto: ImportProgressDto) {
    return this.service.importProgress(userId, dto);
  }

  @Get('sessions')
  listSessions(@UserId() userId: string) {
    return this.service.listSessions(userId);
  }

  @Post('sessions')
  createSession(@UserId() userId: string, @Body() dto: CreateTestSessionDto) {
    return this.service.createSession(userId, dto);
  }

  @Post('sessions/import')
  @HttpCode(204)
  importSessions(@UserId() userId: string, @Body() dto: ImportTestSessionsDto) {
    return this.service.importSessions(userId, dto);
  }

  @Get('activity')
  listActivityDays(@UserId() userId: string) {
    return this.service.listActivityDays(userId);
  }

  @Put('activity/:day')
  @HttpCode(204)
  addActivityDay(@UserId() userId: string, @Param('day') day: string) {
    return this.service.addActivityDay(userId, day);
  }

  @Post('activity/import')
  @HttpCode(204)
  importActivityDays(@UserId() userId: string, @Body() dto: ImportActivityDaysDto) {
    return this.service.importActivityDays(userId, dto);
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Question } from '../questions/entities/question.entity';
import { QuestionProgress } from './entities/question-progress.entity';
import { AnswerEvent } from './entities/answer-event.entity';
import { TicketResult } from './entities/ticket-result.entity';
import { TestSession } from './entities/test-session.entity';
import { ActivityDay } from './entities/activity-day.entity';
import {
  CreateTestSessionDto,
  DAY_PATTERN,
  ImportActivityDaysDto,
  ImportProgressDto,
  ImportTestSessionsDto,
  TicketResultDto,
} from './dto/progress.dto';

// Frontend'ga qaytariladigan javoblar tarixi chegarasi (eng so'nggilari).
const HISTORY_LIMIT = 4000;
const SESSIONS_LIMIT = 200;

export interface ProgressState {
  correctIds: string[];
  mistakes: Record<string, number>;
  savedIds: string[];
  ticketStats: Record<number, { correct: number; wrong: number }>;
  history: { questionId: string; isCorrect: boolean; timestamp: number }[];
}

export interface TestSessionView {
  id: string;
  title: string;
  correct: number;
  wrong: number;
  total: number;
  timestamp: number;
}

function isValidDay(day: string): boolean {
  if (!DAY_PATTERN.test(day)) {
    return false;
  }
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(day);
}

function toSessionView(s: TestSession): TestSessionView {
  return {
    id: s.id,
    title: s.title,
    correct: s.correct,
    wrong: s.wrong,
    total: s.total,
    timestamp: s.createdAt.getTime(),
  };
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Question) private readonly questionsRepo: Repository<Question>,
    @InjectRepository(QuestionProgress) private readonly progressRepo: Repository<QuestionProgress>,
    @InjectRepository(AnswerEvent) private readonly eventsRepo: Repository<AnswerEvent>,
    @InjectRepository(TicketResult) private readonly ticketsRepo: Repository<TicketResult>,
    @InjectRepository(TestSession) private readonly sessionsRepo: Repository<TestSession>,
    @InjectRepository(ActivityDay) private readonly daysRepo: Repository<ActivityDay>,
  ) {}

  async getState(userId: string): Promise<ProgressState> {
    const [rows, events, tickets] = await Promise.all([
      this.progressRepo.find({ where: { userId } }),
      this.eventsRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: HISTORY_LIMIT,
      }),
      this.ticketsRepo.find({ where: { userId } }),
    ]);

    const mistakes: Record<string, number> = {};
    for (const r of rows) {
      if (r.status === 'wrong') {
        mistakes[r.questionId] = r.selectedOption ?? -1;
      }
    }

    const ticketStats: ProgressState['ticketStats'] = {};
    for (const t of tickets) {
      ticketStats[t.ticketNumber] = { correct: t.correct, wrong: t.wrong };
    }

    return {
      correctIds: rows.filter((r) => r.status === 'correct').map((r) => r.questionId),
      mistakes,
      savedIds: rows.filter((r) => r.isSaved).map((r) => r.questionId),
      ticketStats,
      history: events
        .reverse()
        .map((e) => ({ questionId: e.questionId, isCorrect: e.isCorrect, timestamp: e.createdAt.getTime() })),
    };
  }

  /** To'g'ri/xato server tomonida savolning to'g'ri javobi bo'yicha aniqlanadi. */
  async recordAnswer(userId: string, questionId: string, selectedOption: number) {
    const question = await this.questionsRepo.findOne({
      where: { id: questionId },
      select: { id: true, correctOptionIndex: true },
    });
    if (!question) {
      throw new NotFoundException('Savol topilmadi.');
    }
    const isCorrect = question.correctOptionIndex === selectedOption;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO "user_question_progress" ("user_id", "question_id", "status", "selected_option", "is_saved")
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT ("user_id", "question_id") DO UPDATE
         SET "status" = EXCLUDED."status", "selected_option" = EXCLUDED."selected_option", "updated_at" = now()`,
        [userId, questionId, isCorrect ? 'correct' : 'wrong', selectedOption],
      );
      await manager.insert(AnswerEvent, { userId, questionId, isCorrect });
    });

    return { isCorrect };
  }

  async setSaved(userId: string, questionId: string, saved: boolean): Promise<void> {
    if (!(await this.questionsRepo.exists({ where: { id: questionId } }))) {
      throw new NotFoundException('Savol topilmadi.');
    }
    await this.dataSource.query(
      `INSERT INTO "user_question_progress" ("user_id", "question_id", "is_saved")
       VALUES ($1, $2, $3)
       ON CONFLICT ("user_id", "question_id") DO UPDATE
       SET "is_saved" = EXCLUDED."is_saved", "updated_at" = now()`,
      [userId, questionId, saved],
    );
    await this.pruneEmptyRows(userId);
  }

  async setTicketResult(userId: string, ticketNumber: number, dto: TicketResultDto): Promise<void> {
    await this.ticketsRepo.upsert(
      { userId, ticketNumber, correct: dto.correct, wrong: dto.wrong },
      ['userId', 'ticketNumber'],
    );
  }

  async clearTicketResults(userId: string): Promise<void> {
    await this.ticketsRepo.delete({ userId });
  }

  /** "Progressni qayta boshlash": javoblar, tarix va bilet natijalari o'chadi; saqlangan savollar qoladi. */
  async resetProgress(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.update(QuestionProgress, { userId }, { status: null, selectedOption: null });
      await manager.delete(AnswerEvent, { userId });
      await manager.delete(TicketResult, { userId });
    });
    await this.pruneEmptyRows(userId);
  }

  async listSessions(userId: string): Promise<TestSessionView[]> {
    const sessions = await this.sessionsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: SESSIONS_LIMIT,
    });
    return sessions.map(toSessionView);
  }

  async createSession(userId: string, dto: CreateTestSessionDto): Promise<TestSessionView> {
    const session = await this.sessionsRepo.save(this.sessionsRepo.create({ ...dto, userId }));
    return toSessionView(session);
  }

  async listActivityDays(userId: string): Promise<string[]> {
    const days = await this.daysRepo.find({ where: { userId }, order: { day: 'ASC' } });
    return days.map((d) => d.day);
  }

  async addActivityDay(userId: string, day: string): Promise<void> {
    if (!isValidDay(day)) {
      throw new BadRequestException("Sana YYYY-MM-DD formatida bo'lishi kerak.");
    }
    await this.daysRepo.upsert({ userId, day }, ['userId', 'day']);
  }

  /**
   * Brauzerdagi (localStorage) eski progressni serverga ko'chirish.
   * Server'dagi ma'lumot ustun: mavjud javob holati o'zgarmaydi, faqat yetishmayotganlari qo'shiladi.
   */
  async importProgress(userId: string, dto: ImportProgressDto): Promise<void> {
    const allIds = [
      ...dto.correctIds,
      ...dto.mistakes.map((m) => m.questionId),
      ...dto.savedIds,
      ...dto.history.map((h) => h.questionId),
    ];
    const existing = await this.existingQuestionIds(allIds);

    const merged = new Map<string, { status: string | null; option: number | null; saved: boolean }>();
    const entry = (id: string) => {
      let e = merged.get(id);
      if (!e) {
        e = { status: null, option: null, saved: false };
        merged.set(id, e);
      }
      return e;
    };
    for (const id of dto.correctIds) {
      if (existing.has(id)) entry(id).status = 'correct';
    }
    for (const m of dto.mistakes) {
      if (existing.has(m.questionId)) Object.assign(entry(m.questionId), { status: 'wrong', option: m.selectedOption });
    }
    for (const id of dto.savedIds) {
      if (existing.has(id)) entry(id).saved = true;
    }

    const tickets = new Map(dto.ticketStats.map((t) => [t.ticketNumber, t]));
    const history = dto.history.filter((h) => existing.has(h.questionId));

    await this.dataSource.transaction(async (manager) => {
      if (merged.size) {
        const ids = [...merged.keys()];
        const values = [...merged.values()];
        await manager.query(
          `INSERT INTO "user_question_progress" ("user_id", "question_id", "status", "selected_option", "is_saved")
           SELECT $1, t.q, t.s, t.o, t.sv
           FROM unnest($2::uuid[], $3::varchar[], $4::int[], $5::bool[]) AS t(q, s, o, sv)
           ON CONFLICT ("user_id", "question_id") DO UPDATE SET
             "status" = COALESCE("user_question_progress"."status", EXCLUDED."status"),
             "selected_option" = CASE WHEN "user_question_progress"."status" IS NULL
               THEN EXCLUDED."selected_option" ELSE "user_question_progress"."selected_option" END,
             "is_saved" = "user_question_progress"."is_saved" OR EXCLUDED."is_saved",
             "updated_at" = now()`,
          [userId, ids, values.map((v) => v.status), values.map((v) => v.option), values.map((v) => v.saved)],
        );
      }

      if (tickets.size) {
        const list = [...tickets.values()];
        await manager.query(
          `INSERT INTO "user_ticket_results" ("user_id", "ticket_number", "correct", "wrong")
           SELECT $1, t.n, t.c, t.w FROM unnest($2::int[], $3::int[], $4::int[]) AS t(n, c, w)
           ON CONFLICT ("user_id", "ticket_number") DO NOTHING`,
          [userId, list.map((t) => t.ticketNumber), list.map((t) => t.correct), list.map((t) => t.wrong)],
        );
      }

      if (history.length) {
        await manager.query(
          `INSERT INTO "answer_events" ("user_id", "question_id", "is_correct", "created_at")
           SELECT $1, t.q, t.c, to_timestamp(t.ts / 1000.0)
           FROM unnest($2::uuid[], $3::bool[], $4::float8[]) AS t(q, c, ts)`,
          [userId, history.map((h) => h.questionId), history.map((h) => h.isCorrect), history.map((h) => h.timestamp)],
        );
      }
    });
  }

  async importSessions(userId: string, dto: ImportTestSessionsDto): Promise<void> {
    if (!dto.sessions.length) {
      return;
    }
    const s = dto.sessions;
    await this.dataSource.query(
      `INSERT INTO "test_sessions" ("user_id", "title", "correct", "wrong", "total", "created_at")
       SELECT $1, t.title, t.c, t.w, t.total, to_timestamp(t.ts / 1000.0)
       FROM unnest($2::varchar[], $3::int[], $4::int[], $5::int[], $6::float8[]) AS t(title, c, w, total, ts)`,
      [
        userId,
        s.map((x) => x.title),
        s.map((x) => x.correct),
        s.map((x) => x.wrong),
        s.map((x) => x.total),
        s.map((x) => x.timestamp),
      ],
    );
  }

  async importActivityDays(userId: string, dto: ImportActivityDaysDto): Promise<void> {
    const days = [...new Set(dto.days)].filter(isValidDay);
    if (!days.length) {
      return;
    }
    await this.dataSource.query(
      `INSERT INTO "user_activity_days" ("user_id", "day")
       SELECT $1, d FROM unnest($2::date[]) AS d
       ON CONFLICT ("user_id", "day") DO NOTHING`,
      [userId, days],
    );
  }

  private async existingQuestionIds(ids: string[]): Promise<Set<string>> {
    const unique = [...new Set(ids)];
    if (!unique.length) {
      return new Set();
    }
    const rows: { id: string }[] = await this.dataSource.query(
      `SELECT "id" FROM "questions" WHERE "id" = ANY($1::uuid[])`,
      [unique],
    );
    return new Set(rows.map((r) => r.id));
  }

  // Na javobi, na "saqlangan" belgisi qolmagan qatorlar keraksiz.
  private async pruneEmptyRows(userId: string): Promise<void> {
    await this.progressRepo
      .createQueryBuilder()
      .delete()
      .where('"user_id" = :userId AND "status" IS NULL AND "is_saved" = false', { userId })
      .execute();
  }
}

import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { ProgressApiService, ProgressImport, ProgressState } from './progress-api.service';
import { ServerSync } from '../utils/server-sync';

export interface TicketStat {
  correct: number;
  wrong: number;
}

export interface AnswerEvent {
  questionId: string;
  isCorrect: boolean;
  timestamp: number;
}

// localStorage endi faqat mehmon (login qilmagan) foydalanuvchi uchun ishlatiladi.
// Login qilgan foydalanuvchining progressi serverda; eski lokal ma'lumot birinchi kirishda serverga ko'chiriladi.
const SAVED_KEY = 'avtotez-guliston-saved-questions';
const MISTAKES_KEY = 'avtotez-guliston-mistakes';
const CORRECT_KEY = 'avtotez-guliston-correct-questions';
const TICKET_STATS_KEY = 'avtotez-guliston-ticket-stats';
const HISTORY_KEY = 'avtotez-guliston-answer-history';
const LEGACY_KEYS = [SAVED_KEY, MISTAKES_KEY, CORRECT_KEY, TICKET_STATS_KEY, HISTORY_KEY];
const GUEST_SCOPE = 'guest';
const MAX_HISTORY = 4000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function key(base: string, scope: string): string {
  return `${base}:${scope}`;
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ProgressApiService);
  private readonly sync = new ServerSync<ProgressState>(
    () => this.api.getState(),
    (state) => this.applyServerState(state),
  );
  private userId: string | null = null;

  private readonly savedIdsSignal = signal<Set<string>>(new Set());
  private readonly mistakesSignal = signal<Record<string, number>>({});
  private readonly correctIdsSignal = signal<Set<string>>(new Set());
  private readonly ticketStatsSignal = signal<Record<number, TicketStat>>({});
  private readonly historySignal = signal<AnswerEvent[]>([]);

  readonly savedIds = this.savedIdsSignal.asReadonly();
  readonly mistakes = this.mistakesSignal.asReadonly();
  readonly correctIds = this.correctIdsSignal.asReadonly();
  readonly ticketStats = this.ticketStatsSignal.asReadonly();
  /** Timestamped answer log, oldest first. Only exists from the point this feature shipped — do not treat its absence as "never answered". */
  readonly history = this.historySignal.asReadonly();

  constructor() {
    // Birinchi holat darhol o'rnatiladi: effect kechroq ishlaydi, komponent esa konstruktorida
    // servis metodini chaqirishi mumkin (masalan, dashboard'dagi recordToday).
    this.switchUser(this.auth.currentUser()?.id ?? null);
    effect(() => {
      const userId = this.auth.currentUser()?.id ?? null;
      untracked(() => {
        if (userId !== this.userId) {
          this.switchUser(userId);
        }
      });
    });
  }

  private switchUser(userId: string | null): void {
    this.userId = userId;
    this.sync.setActive(userId !== null);

    if (!userId) {
      this.loadGuest();
      return;
    }

    // Server javobi kelguncha boshqa foydalanuvchining ma'lumoti ko'rinib turmasin.
    this.applyServerState({ correctIds: [], mistakes: {}, savedIds: [], ticketStats: {}, history: [] });

    const legacy = this.readLegacy(userId);
    if (legacy) {
      this.sync.write(this.api.importProgress(legacy).pipe(tap(() => this.clearLegacy(userId))));
    }
    this.sync.load();
  }

  private loadGuest(): void {
    this.savedIdsSignal.set(new Set(readJson<string[]>(key(SAVED_KEY, GUEST_SCOPE), [])));
    this.mistakesSignal.set(readJson<Record<string, number>>(key(MISTAKES_KEY, GUEST_SCOPE), {}));
    this.correctIdsSignal.set(new Set(readJson<string[]>(key(CORRECT_KEY, GUEST_SCOPE), [])));
    this.ticketStatsSignal.set(
      readJson<Record<number, TicketStat>>(key(TICKET_STATS_KEY, GUEST_SCOPE), {}),
    );
    this.historySignal.set(readJson<AnswerEvent[]>(key(HISTORY_KEY, GUEST_SCOPE), []));
  }

  private applyServerState(state: ProgressState): void {
    this.savedIdsSignal.set(new Set(state.savedIds));
    this.mistakesSignal.set(state.mistakes);
    this.correctIdsSignal.set(new Set(state.correctIds));
    this.ticketStatsSignal.set(state.ticketStats);
    this.historySignal.set(state.history);
  }

  /** Server'ga o'tishdan oldin shu foydalanuvchi uchun localStorage'da yig'ilgan progress (bo'lsa). */
  private readLegacy(userId: string): ProgressImport | null {
    const isId = (id: unknown): id is string => typeof id === 'string' && UUID_PATTERN.test(id);
    const mistakes = readJson<Record<string, number>>(key(MISTAKES_KEY, userId), {});
    const tickets = readJson<Record<string, TicketStat>>(key(TICKET_STATS_KEY, userId), {});

    const payload: ProgressImport = {
      correctIds: readJson<string[]>(key(CORRECT_KEY, userId), []).filter(isId),
      mistakes: Object.entries(mistakes)
        .filter(([id, option]) => isId(id) && Number.isInteger(option) && option >= 0)
        .map(([questionId, selectedOption]) => ({ questionId, selectedOption })),
      savedIds: readJson<string[]>(key(SAVED_KEY, userId), []).filter(isId),
      ticketStats: Object.entries(tickets)
        .map(([n, s]) => ({ ticketNumber: Number(n), correct: s?.correct, wrong: s?.wrong }))
        .filter(
          (t) =>
            Number.isInteger(t.ticketNumber) &&
            t.ticketNumber > 0 &&
            Number.isInteger(t.correct) &&
            Number.isInteger(t.wrong),
        ),
      history: readJson<AnswerEvent[]>(key(HISTORY_KEY, userId), [])
        .filter((e) => isId(e?.questionId) && typeof e.isCorrect === 'boolean' && Number.isFinite(e.timestamp))
        .slice(-MAX_HISTORY)
        .map((e) => ({ questionId: e.questionId, isCorrect: e.isCorrect, timestamp: Math.trunc(e.timestamp) })),
    };

    const isEmpty =
      !payload.correctIds.length &&
      !payload.mistakes.length &&
      !payload.savedIds.length &&
      !payload.ticketStats.length &&
      !payload.history.length;
    if (isEmpty) {
      this.clearLegacy(userId);
      return null;
    }
    return payload;
  }

  private clearLegacy(userId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    for (const base of LEGACY_KEYS) {
      localStorage.removeItem(key(base, userId));
    }
  }

  isSaved(questionId: string): boolean {
    return this.savedIdsSignal().has(questionId);
  }

  toggleSaved(questionId: string): void {
    const next = new Set(this.savedIdsSignal());
    const saved = !next.has(questionId);
    if (saved) {
      next.add(questionId);
    } else {
      next.delete(questionId);
    }
    this.savedIdsSignal.set(next);

    if (this.userId) {
      this.sync.write(this.api.setSaved(questionId, saved));
    } else {
      writeJson(key(SAVED_KEY, GUEST_SCOPE), [...next]);
    }
  }

  recordAnswer(questionId: string, isCorrect: boolean, selectedOptionIndex: number): void {
    const nextMistakes = { ...this.mistakesSignal() };
    const nextCorrect = new Set(this.correctIdsSignal());

    if (isCorrect) {
      delete nextMistakes[questionId];
      nextCorrect.add(questionId);
    } else {
      nextMistakes[questionId] = selectedOptionIndex;
      nextCorrect.delete(questionId);
    }

    this.mistakesSignal.set(nextMistakes);
    this.correctIdsSignal.set(nextCorrect);

    const nextHistory = [...this.historySignal(), { questionId, isCorrect, timestamp: Date.now() }];
    if (nextHistory.length > MAX_HISTORY) {
      nextHistory.splice(0, nextHistory.length - MAX_HISTORY);
    }
    this.historySignal.set(nextHistory);

    if (this.userId) {
      this.sync.write(this.api.recordAnswer(questionId, selectedOptionIndex));
      return;
    }
    writeJson(key(MISTAKES_KEY, GUEST_SCOPE), nextMistakes);
    writeJson(key(CORRECT_KEY, GUEST_SCOPE), [...nextCorrect]);
    writeJson(key(HISTORY_KEY, GUEST_SCOPE), nextHistory);
  }

  recordTicketResult(ticketNumber: number, correct: number, wrong: number): void {
    const next = { ...this.ticketStatsSignal(), [ticketNumber]: { correct, wrong } };
    this.ticketStatsSignal.set(next);

    if (this.userId) {
      this.sync.write(this.api.setTicketResult(ticketNumber, correct, wrong));
    } else {
      writeJson(key(TICKET_STATS_KEY, GUEST_SCOPE), next);
    }
  }

  resetTicketStats(): void {
    this.ticketStatsSignal.set({});

    if (this.userId) {
      this.sync.write(this.api.clearTicketResults());
    } else {
      writeJson(key(TICKET_STATS_KEY, GUEST_SCOPE), {});
    }
  }

  resetProgress(): void {
    this.mistakesSignal.set({});
    this.correctIdsSignal.set(new Set());
    this.ticketStatsSignal.set({});
    this.historySignal.set([]);

    if (this.userId) {
      this.sync.write(this.api.reset());
      return;
    }
    writeJson(key(MISTAKES_KEY, GUEST_SCOPE), {});
    writeJson(key(CORRECT_KEY, GUEST_SCOPE), []);
    writeJson(key(TICKET_STATS_KEY, GUEST_SCOPE), {});
    writeJson(key(HISTORY_KEY, GUEST_SCOPE), []);
  }
}

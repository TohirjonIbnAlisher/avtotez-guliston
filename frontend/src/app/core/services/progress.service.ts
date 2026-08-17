import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface TicketStat {
  correct: number;
  wrong: number;
}

export interface AnswerEvent {
  questionId: string;
  isCorrect: boolean;
  timestamp: number;
}

const SAVED_KEY = 'avtotez-guliston-saved-questions';
const MISTAKES_KEY = 'avtotez-guliston-mistakes';
const CORRECT_KEY = 'avtotez-guliston-correct-questions';
const TICKET_STATS_KEY = 'avtotez-guliston-ticket-stats';
const HISTORY_KEY = 'avtotez-guliston-answer-history';
const MAX_HISTORY = 4000;

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

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly auth = inject(AuthService);

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
    effect(() => {
      const scope = this.scope();
      this.savedIdsSignal.set(new Set(readJson<string[]>(this.key(SAVED_KEY, scope), [])));
      this.mistakesSignal.set(readJson<Record<string, number>>(this.key(MISTAKES_KEY, scope), {}));
      this.correctIdsSignal.set(new Set(readJson<string[]>(this.key(CORRECT_KEY, scope), [])));
      this.ticketStatsSignal.set(
        readJson<Record<number, TicketStat>>(this.key(TICKET_STATS_KEY, scope), {}),
      );
      this.historySignal.set(readJson<AnswerEvent[]>(this.key(HISTORY_KEY, scope), []));
    });
  }

  private scope(): string {
    return this.auth.currentUser()?.id ?? 'guest';
  }

  private key(base: string, scope: string): string {
    return `${base}:${scope}`;
  }

  isSaved(questionId: string): boolean {
    return this.savedIdsSignal().has(questionId);
  }

  toggleSaved(questionId: string): void {
    const next = new Set(this.savedIdsSignal());
    if (next.has(questionId)) {
      next.delete(questionId);
    } else {
      next.add(questionId);
    }
    this.savedIdsSignal.set(next);
    writeJson(this.key(SAVED_KEY, this.scope()), [...next]);
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

    const scope = this.scope();
    writeJson(this.key(MISTAKES_KEY, scope), nextMistakes);
    writeJson(this.key(CORRECT_KEY, scope), [...nextCorrect]);
    writeJson(this.key(HISTORY_KEY, scope), nextHistory);
  }

  recordTicketResult(ticketNumber: number, correct: number, wrong: number): void {
    const next = { ...this.ticketStatsSignal(), [ticketNumber]: { correct, wrong } };
    this.ticketStatsSignal.set(next);
    writeJson(this.key(TICKET_STATS_KEY, this.scope()), next);
  }

  resetTicketStats(): void {
    this.ticketStatsSignal.set({});
    writeJson(this.key(TICKET_STATS_KEY, this.scope()), {});
  }

  resetProgress(): void {
    this.mistakesSignal.set({});
    this.correctIdsSignal.set(new Set());
    this.ticketStatsSignal.set({});
    this.historySignal.set([]);
    const scope = this.scope();
    writeJson(this.key(MISTAKES_KEY, scope), {});
    writeJson(this.key(CORRECT_KEY, scope), []);
    writeJson(this.key(TICKET_STATS_KEY, scope), {});
    writeJson(this.key(HISTORY_KEY, scope), []);
  }
}

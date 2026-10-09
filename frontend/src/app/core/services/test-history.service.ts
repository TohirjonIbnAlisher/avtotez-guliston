import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { ProgressApiService } from './progress-api.service';
import { ServerSync } from '../utils/server-sync';

export interface TestSessionRecord {
  id: string;
  title: string;
  correct: number;
  wrong: number;
  total: number;
  timestamp: number;
}

// localStorage faqat mehmon uchun; login qilgan foydalanuvchining test tarixi serverda.
const HISTORY_KEY = 'avtotez-guliston-test-history';
const GUEST_SCOPE = 'guest';
const MAX_SESSIONS = 200;

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
export class TestHistoryService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ProgressApiService);
  private readonly sync = new ServerSync<TestSessionRecord[]>(
    () => this.api.getSessions(),
    (sessions) => this.sessionsSignal.set(sessions),
  );
  private userId: string | null = null;
  private readonly sessionsSignal = signal<TestSessionRecord[]>([]);

  /** Most recent first. Only populated from the point this feature shipped. */
  readonly sessions = this.sessionsSignal.asReadonly();

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

  private key(scope: string): string {
    return `${HISTORY_KEY}:${scope}`;
  }

  private switchUser(userId: string | null): void {
    this.userId = userId;
    this.sync.setActive(userId !== null);

    if (!userId) {
      this.sessionsSignal.set(readJson<TestSessionRecord[]>(this.key(GUEST_SCOPE), []));
      return;
    }

    this.sessionsSignal.set([]);
    const legacyKey = this.key(userId);
    const legacy = readJson<TestSessionRecord[]>(legacyKey, [])
      .filter(
        (s) =>
          typeof s?.title === 'string' &&
          [s.correct, s.wrong, s.total].every((n) => Number.isInteger(n) && n >= 0) &&
          Number.isFinite(s.timestamp),
      )
      .slice(0, MAX_SESSIONS)
      .map((s) => ({
        title: s.title.slice(0, 200),
        correct: s.correct,
        wrong: s.wrong,
        total: s.total,
        timestamp: Math.trunc(s.timestamp),
      }));
    if (legacy.length) {
      this.sync.write(
        this.api.importSessions(legacy).pipe(tap(() => localStorage.removeItem(legacyKey))),
      );
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(legacyKey);
    }
    this.sync.load();
  }

  recordSession(title: string, correct: number, wrong: number, total: number): void {
    const record: TestSessionRecord = {
      id: crypto.randomUUID(),
      title,
      correct,
      wrong,
      total,
      timestamp: Date.now(),
    };
    const next = [record, ...this.sessionsSignal()].slice(0, MAX_SESSIONS);
    this.sessionsSignal.set(next);

    if (this.userId) {
      this.sync.write(this.api.createSession({ title, correct, wrong, total }));
    } else {
      writeJson(this.key(GUEST_SCOPE), next);
    }
  }
}

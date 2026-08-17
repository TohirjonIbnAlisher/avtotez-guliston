import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface TestSessionRecord {
  id: string;
  title: string;
  correct: number;
  wrong: number;
  total: number;
  timestamp: number;
}

const HISTORY_KEY = 'avtotez-guliston-test-history';
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
  private readonly sessionsSignal = signal<TestSessionRecord[]>([]);

  /** Most recent first. Only populated from the point this feature shipped. */
  readonly sessions = this.sessionsSignal.asReadonly();

  constructor() {
    effect(() => {
      this.sessionsSignal.set(readJson<TestSessionRecord[]>(this.key(), []));
    });
  }

  private key(): string {
    return `${HISTORY_KEY}:${this.auth.currentUser()?.id ?? 'guest'}`;
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
    writeJson(this.key(), next);
  }
}

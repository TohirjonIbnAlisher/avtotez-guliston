import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from './auth.service';
import { ProgressApiService } from './progress-api.service';
import { ServerSync } from '../utils/server-sync';

// localStorage faqat mehmon uchun; login qilgan foydalanuvchining faol kunlari serverda.
const STORAGE_KEY = 'avtotez-guliston-activity-dates';
const GUEST_SCOPE = 'guest';
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readDates(key: string): Set<string> {
  if (typeof localStorage === 'undefined') {
    return new Set();
  }
  const raw = localStorage.getItem(key);
  if (!raw) {
    return new Set();
  }
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeDates(key: string, dates: Set<string>): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify([...dates]));
}

@Injectable({ providedIn: 'root' })
export class StreakService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ProgressApiService);
  private readonly sync = new ServerSync<string[]>(
    () => this.api.getActivityDays(),
    (days) => this.datesSignal.set(new Set(days)),
  );
  private userId: string | null = null;
  private readonly datesSignal = signal<Set<string>>(new Set());

  readonly streakDays = computed(() => {
    let streak = 0;
    const cursor = new Date();
    const dates = this.datesSignal();
    while (dates.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  });

  readonly recentDays = computed(() => {
    const dates = this.datesSignal();
    const days: { date: Date; active: boolean }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ date: d, active: dates.has(dateKey(d)) });
    }
    return days;
  });

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

  private storageKey(scope: string): string {
    return `${STORAGE_KEY}:${scope}`;
  }

  private switchUser(userId: string | null): void {
    this.userId = userId;
    this.sync.setActive(userId !== null);

    if (!userId) {
      this.datesSignal.set(readDates(this.storageKey(GUEST_SCOPE)));
      return;
    }

    this.datesSignal.set(new Set());
    const legacyKey = this.storageKey(userId);
    const legacy = [...readDates(legacyKey)].filter((d) => DAY_PATTERN.test(d));
    if (legacy.length) {
      this.sync.write(
        this.api.importActivityDays(legacy).pipe(tap(() => localStorage.removeItem(legacyKey))),
      );
    }
    this.sync.load();
  }

  recordToday(): void {
    const today = dateKey(new Date());
    if (this.datesSignal().has(today)) {
      return;
    }
    const next = new Set(this.datesSignal());
    next.add(today);
    this.datesSignal.set(next);

    if (this.userId) {
      this.sync.write(this.api.addActivityDay(today));
    } else {
      writeDates(this.storageKey(GUEST_SCOPE), next);
    }
  }
}

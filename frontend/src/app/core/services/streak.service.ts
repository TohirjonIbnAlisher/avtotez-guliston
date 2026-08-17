import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'avtotez-guliston-activity-dates';

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
    effect(() => {
      this.datesSignal.set(readDates(this.storageKey()));
    });
  }

  private storageKey(): string {
    return `${STORAGE_KEY}:${this.auth.currentUser()?.id ?? 'guest'}`;
  }

  recordToday(): void {
    const today = dateKey(new Date());
    if (this.datesSignal().has(today)) {
      return;
    }
    const next = new Set(this.datesSignal());
    next.add(today);
    this.datesSignal.set(next);
    writeDates(this.storageKey(), next);
  }
}

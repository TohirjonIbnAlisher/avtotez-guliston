import { Injectable, signal } from '@angular/core';

const AUTO_ADVANCE_KEY = 'avtotez-guliston-auto-advance';
const DAILY_GOAL_KEY = 'avtotez-guliston-daily-goal';

/** Kunlik maqsad uchun tanlanadigan qiymatlar (savollar soni). */
export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50] as const;
const DEFAULT_DAILY_GOAL = 20;

function read(key: string): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}

function write(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function readDailyGoal(): number {
  const value = Number(read(DAILY_GOAL_KEY));
  return (DAILY_GOAL_OPTIONS as readonly number[]).includes(value) ? value : DEFAULT_DAILY_GOAL;
}

/** Test yechish sozlamalari (shu qurilmada eslab qolinadi). */
@Injectable({ providedIn: 'root' })
export class TestPreferencesService {
  /** Javob belgilangandan keyin keyingi savolga avtomatik o'tish. */
  readonly autoAdvance = signal(read(AUTO_ADVANCE_KEY) === 'true');
  /** Kunlik maqsad — shuncha savol. */
  readonly dailyGoal = signal(readDailyGoal());

  setAutoAdvance(value: boolean): void {
    this.autoAdvance.set(value);
    write(AUTO_ADVANCE_KEY, String(value));
  }

  setDailyGoal(value: number): void {
    this.dailyGoal.set(value);
    write(DAILY_GOAL_KEY, String(value));
  }
}

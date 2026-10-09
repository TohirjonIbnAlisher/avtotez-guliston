import { Injectable, signal } from '@angular/core';

const AUTO_ADVANCE_KEY = 'avtotez-guliston-auto-advance';

function readAutoAdvance(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  return localStorage.getItem(AUTO_ADVANCE_KEY) === 'true';
}

/** Test yechish sozlamalari (shu qurilmada eslab qolinadi). */
@Injectable({ providedIn: 'root' })
export class TestPreferencesService {
  /** Javob belgilangandan keyin keyingi savolga avtomatik o'tish. */
  readonly autoAdvance = signal(readAutoAdvance());

  setAutoAdvance(value: boolean): void {
    this.autoAdvance.set(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTO_ADVANCE_KEY, String(value));
    }
  }
}

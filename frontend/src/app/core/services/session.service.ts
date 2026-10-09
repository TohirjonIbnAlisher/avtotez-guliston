import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ACTIVITY_KEY, AuthService } from './auth.service';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;
/** Faollik localStorage'ga ko'pi bilan shuncha vaqtda bir yoziladi. */
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 10_000;
const PROTECTED_PREFIXES = ['/dashboard', '/progress', '/admin'];

/**
 * Faolsizlik bo'yicha avtomatik chiqish va faol foydalanuvchi uchun access token'ni oldindan yangilash.
 * Oxirgi faollik vaqti barcha tablar uchun umumiy (localStorage) — bitta tabda ishlash qolganlarini ham "faol" qiladi.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private lastWrite = 0;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    // Boshqa tabda chiqilsa (yoki sessiya tugasa) — himoyalangan sahifadan login'ga.
    let wasAuthenticated = this.auth.isAuthenticated();
    effect(() => {
      const now = this.auth.isAuthenticated();
      if (wasAuthenticated && !now && PROTECTED_PREFIXES.some((p) => this.router.url.startsWith(p))) {
        this.router.navigate(['/login']);
      }
      wasAuthenticated = now;
    });
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, () => this.markActive(), { passive: true, capture: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.check(); // uzoq vaqtdan keyin tabga qaytilganda darhol tekshiriladi
      }
    });
    setInterval(() => this.check(), CHECK_INTERVAL_MS);
    this.check();
  }

  private lastActivity(): number {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  }

  private markActive(): void {
    const now = Date.now();
    if (now - this.lastWrite < ACTIVITY_WRITE_THROTTLE_MS) {
      return;
    }
    this.lastWrite = now;
    if (this.auth.isAuthenticated()) {
      localStorage.setItem(ACTIVITY_KEY, String(now));
    }
  }

  private check(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    const idleFor = Date.now() - this.lastActivity();
    if (idleFor > this.auth.idleTimeoutMs) {
      this.auth.logout();
      this.router.navigate(['/login'], { queryParams: { reason: 'idle' } });
      return;
    }
    // Faol foydalanuvchi so'rov yubormasa ham sessiya serverda "eskirmasligi" uchun.
    if (this.auth.accessExpiresSoon()) {
      this.auth.refreshAccessToken(this.auth.token).catch((error) => {
        if (this.auth.isSessionError(error) && this.auth.isAuthenticated()) {
          this.auth.clear();
          this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
        }
      });
    }
  }
}

import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ACTIVITY_KEY, AuthService } from './auth.service';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;
/** Faollik localStorage'ga ko'pi bilan shuncha vaqtda bir yoziladi. */
const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 10_000;
/** Bitta qurilma qoidasi: boshqa qurilmadan kirilganini sezish uchun sessiya shuncha vaqtda bir tekshiriladi. */
const VERIFY_INTERVAL_MS = 30_000;
const PROTECTED_PREFIXES = ['/dashboard', '/progress', '/profile', '/admin'];

/**
 * Faolsizlik bo'yicha avtomatik chiqish va faol foydalanuvchi uchun access token'ni oldindan yangilash.
 * Oxirgi faollik vaqti barcha tablar uchun umumiy (localStorage) — bitta tabda ishlash qolganlarini ham "faol" qiladi.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private lastWrite = 0;
  private lastVerify = 0;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    // Boshqa tabda chiqilsa (yoki sessiya tugasa) — himoyalangan sahifadan login'ga.
    let wasAuthenticated = this.auth.isAuthenticated();
    effect(() => {
      const now = this.auth.isAuthenticated();
      if (wasAuthenticated && !now && PROTECTED_PREFIXES.some((p) => this.router.url.startsWith(p))) {
        // sessiya avtomatik tugagan bo'lsa (masalan, boshqa qurilmadan kirildi) — sababi ham ko'rsatiladi
        const reason = this.auth.lastEndReason;
        this.router.navigate(['/login'], reason ? { queryParams: { reason } } : {});
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
      this.auth.logout('idle');
      this.router.navigate(['/login'], { queryParams: { reason: 'idle' } });
      return;
    }
    // Ko'rinib turgan tabda vaqti-vaqti bilan sessiya tekshiriladi: boshqa qurilmadan kirilgan bo'lsa,
    // so'rov 401 qaytaradi va interceptor login sahifasiga ("boshqa qurilmadan kirildi") olib o'tadi.
    if (document.visibilityState === 'visible' && Date.now() - this.lastVerify > VERIFY_INTERVAL_MS) {
      this.lastVerify = Date.now();
      this.auth.verifySession().subscribe({ error: () => undefined });
    }
    // Faol foydalanuvchi so'rov yubormasa ham sessiya serverda "eskirmasligi" uchun.
    if (this.auth.accessExpiresSoon()) {
      this.auth.refreshAccessToken(this.auth.token).catch((error) => {
        if (this.auth.isSessionError(error) && this.auth.isAuthenticated()) {
          const reason = this.auth.sessionEndReason(error);
          this.auth.clear(reason);
          this.router.navigate(['/login'], { queryParams: { reason } });
        }
      });
    }
  }
}

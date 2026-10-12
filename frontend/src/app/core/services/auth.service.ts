import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/user.model';

const TOKEN_KEY = 'avtotez-guliston-token';
const REFRESH_KEY = 'avtotez-guliston-refresh-token';
const EXPIRES_KEY = 'avtotez-guliston-token-expires';
const IDLE_KEY = 'avtotez-guliston-idle-seconds';
const USER_KEY = 'avtotez-guliston-user';
export const ACTIVITY_KEY = 'avtotez-guliston-last-activity';
const AUTH_KEYS = [TOKEN_KEY, REFRESH_KEY, EXPIRES_KEY, IDLE_KEY, USER_KEY];

const DEFAULT_IDLE_SECONDS = 30 * 60;
/** Access token tugashiga shuncha qolganda oldindan yangilanadi. */
const REFRESH_MARGIN_MS = 60_000;

interface AuthTokensResponse {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  idleTimeoutSeconds: number;
  user: AuthUser;
}

export type LogoutReason = 'idle' | 'expired';

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function readStoredUser(): AuthUser | null {
  const ls = storage();
  if (!ls) {
    return null;
  }
  // Eski (refresh token'siz, 7 kunlik) sessiyalar endi yaroqsiz — tozalanadi, qayta login kerak.
  if (!ls.getItem(REFRESH_KEY)) {
    AUTH_KEYS.forEach((k) => ls.removeItem(k));
    return null;
  }
  try {
    return JSON.parse(ls.getItem(USER_KEY) ?? 'null') as AuthUser | null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<AuthUser | null>(readStoredUser());
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  /** Profil rasmining to'liq manzili (yo'q bo'lsa null). */
  readonly avatarSrc = computed(() => {
    const url = this.userSignal()?.avatarUrl;
    return url ? (/^https?:\/\//.test(url) ? url : `${environment.apiUrl}${url}`) : null;
  });

  private refreshInFlight: Promise<string> | null = null;

  constructor() {
    // Boshqa tabda login/logout bo'lsa — shu tab ham moslashadi.
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === null || event.key === REFRESH_KEY || event.key === USER_KEY) {
          this.userSignal.set(readStoredUser());
        }
      });
    }
  }

  /** Auth so'rovlari (login/refresh/logout) interceptor tomonidan qayta ishlanmaydi. */
  isAuthEndpoint(url: string): boolean {
    return url.startsWith(this.baseUrl + '/login') || url.startsWith(this.baseUrl + '/refresh') || url.startsWith(this.baseUrl + '/logout');
  }

  login(phone: string, password: string): Observable<AuthTokensResponse> {
    return this.http
      .post<AuthTokensResponse>(`${this.baseUrl}/login`, { phone, password })
      .pipe(tap((res) => this.store(res, true)));
  }

  /** Serverdagi sessiyani bekor qilib, shu qurilmadan chiqish. */
  logout(): void {
    const refreshToken = storage()?.getItem(REFRESH_KEY);
    if (refreshToken) {
      this.http.post(`${this.baseUrl}/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
    this.clear();
  }

  /** Faqat lokal ma'lumotni tozalash (sessiya serverda allaqachon tugagan bo'lsa). */
  clear(): void {
    const ls = storage();
    AUTH_KEYS.forEach((k) => ls?.removeItem(k));
    this.userSignal.set(null);
  }

  /** Sessiya serverda tugaganmi (aks holda — masalan, internet uzilishi — sessiya saqlanadi). */
  isSessionError(error: unknown): boolean {
    return (error instanceof HttpErrorResponse && error.status === 401) ||
      (error instanceof Error && error.message === 'no-session');
  }

  get token(): string | null {
    return storage()?.getItem(TOKEN_KEY) ?? null;
  }

  get idleTimeoutMs(): number {
    const seconds = Number(storage()?.getItem(IDLE_KEY));
    return (Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_IDLE_SECONDS) * 1000;
  }

  /** Access token tugashiga oz qoldimi (yoki tugadimi). */
  accessExpiresSoon(): boolean {
    const expires = Number(storage()?.getItem(EXPIRES_KEY));
    return !expires || expires - Date.now() < REFRESH_MARGIN_MS;
  }

  /**
   * Yangi access token olish. Bir vaqtda bir nechta so'rov yoki tab yangilamoqchi bo'lsa,
   * faqat bittasi serverga boradi; qolganlari uning natijasidan foydalanadi.
   * `staleToken` — yaroqsiz deb topilgan token; agar boshqa tab allaqachon yangisini olgan bo'lsa, o'shani qaytaradi.
   */
  refreshAccessToken(staleToken: string | null): Promise<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.withLock(() => this.doRefresh(staleToken)).finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async doRefresh(staleToken: string | null): Promise<string> {
    const current = this.token;
    if (current && current !== staleToken && !this.accessExpiresSoon()) {
      return current; // boshqa tab yangilab ulgurdi
    }
    const refreshToken = storage()?.getItem(REFRESH_KEY);
    if (!refreshToken) {
      throw new Error('no-session');
    }
    try {
      const res = await firstValueFrom(
        this.http.post<AuthTokensResponse>(`${this.baseUrl}/refresh`, { refreshToken }),
      );
      this.store(res);
      return res.accessToken;
    } catch (err) {
      const code = err instanceof HttpErrorResponse ? err.error?.code : undefined;
      if (code === 'TOKEN_ROTATED') {
        // Boshqa tab shu token bilan yangilab bo'ldi — uning natijasi saqlanguncha biroz kutamiz.
        await new Promise((r) => setTimeout(r, 500));
        const fresh = this.token;
        if (fresh && storage()?.getItem(REFRESH_KEY) !== refreshToken) {
          return fresh;
        }
      }
      throw err;
    }
  }

  // ---------- Profil ----------

  updateProfile(fullName: string): Observable<AuthUser> {
    return this.http.patch<AuthUser>(`${this.baseUrl}/me`, { fullName }).pipe(tap((user) => this.setUser(user)));
  }

  uploadAvatar(file: File): Observable<AuthUser> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<AuthUser>(`${this.baseUrl}/me/avatar`, form).pipe(tap((user) => this.setUser(user)));
  }

  removeAvatar(): Observable<AuthUser> {
    return this.http.delete<AuthUser>(`${this.baseUrl}/me/avatar`).pipe(tap((user) => this.setUser(user)));
  }

  /** Parol almashtiriladi; shu qurilmadagi sessiya saqlanadi, boshqa qurilmalardan chiqariladi. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const refreshToken = storage()?.getItem(REFRESH_KEY) ?? undefined;
    return this.http.put<void>(`${this.baseUrl}/me/password`, { currentPassword, newPassword, refreshToken });
  }

  private setUser(user: AuthUser): void {
    storage()?.setItem(USER_KEY, JSON.stringify(user));
    this.userSignal.set(user);
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? locks.request('avtotez-guliston-auth-refresh', fn) : fn();
  }

  private store(res: AuthTokensResponse, isLogin = false): void {
    const ls = storage();
    if (ls) {
      ls.setItem(TOKEN_KEY, res.accessToken);
      ls.setItem(REFRESH_KEY, res.refreshToken);
      ls.setItem(EXPIRES_KEY, String(res.accessTokenExpiresAt));
      ls.setItem(IDLE_KEY, String(res.idleTimeoutSeconds));
      ls.setItem(USER_KEY, JSON.stringify(res.user));
      if (isLogin) {
        ls.setItem(ACTIVITY_KEY, String(Date.now()));
      }
    }
    const prev = this.userSignal();
    if (
      !prev ||
      prev.id !== res.user.id ||
      prev.role !== res.user.role ||
      prev.fullName !== res.user.fullName ||
      prev.avatarUrl !== res.user.avatarUrl
    ) {
      this.userSignal.set(res.user);
    }
  }
}

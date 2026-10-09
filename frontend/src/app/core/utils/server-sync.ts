import { Observable } from 'rxjs';

/**
 * Server'dagi holatni signal'larga yuklash va optimistic yozuvlarni muvofiqlashtirish.
 *
 * - Yozuv (write) davom etayotganda kelgan yuklash natijasi qo'llanmaydi — aks holda
 *   hali saqlanmagan o'zgarish ekrandan "yo'qolib" qolardi; yozuvlar tugagach qayta yuklanadi.
 * - Yozuv xato bilan tugasa, server holati qayta yuklanadi (optimistic o'zgarish bekor bo'ladi).
 * - Tab/oyna fokusga qaytganda qayta yuklanadi — boshqa tab yoki qurilmadagi o'zgarishlar ko'rinadi.
 */
export class ServerSync<T> {
  private loadSeq = 0;
  private version = 0;
  private pendingWrites = 0;
  private reloadQueued = false;
  private active = false;

  constructor(
    private readonly fetch: () => Observable<T>,
    private readonly apply: (state: T) => void,
  ) {
    onAppFocus(() => {
      if (this.active) {
        this.load();
      }
    });
  }

  /** Server bilan sinxronlashni yoqish (login) yoki o'chirish (guest). */
  setActive(active: boolean): void {
    this.active = active;
    this.loadSeq++; // avvalgi foydalanuvchi uchun ketayotgan yuklashlar bekor
    this.reloadQueued = false;
  }

  load(): void {
    if (!this.active) {
      return;
    }
    const seq = ++this.loadSeq;
    const version = this.version;
    this.fetch().subscribe({
      next: (state) => {
        if (seq !== this.loadSeq || !this.active) {
          return;
        }
        if (this.pendingWrites > 0) {
          this.reloadQueued = true;
          return;
        }
        if (version !== this.version) {
          // So'rov ketgandan keyin yozuv bo'lib, allaqachon tugagan — yangi holatni olamiz.
          this.load();
          return;
        }
        this.apply(state);
      },
      error: () => undefined,
    });
  }

  write(request: Observable<unknown>): void {
    this.version++;
    this.pendingWrites++;
    let failed = false;
    const done = () => {
      this.pendingWrites--;
      if (this.pendingWrites === 0 && (this.reloadQueued || failed)) {
        this.reloadQueued = false;
        this.load();
      }
    };
    request.subscribe({
      error: () => {
        failed = true;
        done();
      },
      complete: done,
    });
  }
}

const FOCUS_THROTTLE_MS = 1000;

function onAppFocus(callback: () => void): void {
  if (typeof document === 'undefined') {
    return;
  }
  let last = 0;
  const fire = () => {
    const now = Date.now();
    if (now - last < FOCUS_THROTTLE_MS) {
      return;
    }
    last = now;
    callback();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fire();
    }
  });
  window.addEventListener('focus', fire);
}

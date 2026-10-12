import { Component, computed, inject, input } from '@angular/core';
import { TranslateService } from '../../core/services/translate.service';

/**
 * Brend belgisi: asfalt rangli nishon ichida sariq rul (pastki "kegay" o'rnida yo'l chizig'i)
 * va ixtiyoriy yozuv — "AVTOTEZ" (oxirgi bo'g'ini sariq) / "GULISTON".
 */
@Component({
  selector: 'app-logo-mark',
  template: `
    <span class="inline-flex items-center gap-2.5">
      <span [class]="badgeClasses()">
        <svg viewBox="0 0 40 40" [class]="iconClasses()" aria-hidden="true">
          <defs>
            <linearGradient id="logo-wheel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fde68a" />
              <stop offset="1" stop-color="#f5b70a" />
            </linearGradient>
          </defs>
          <!-- rul gardishi -->
          <circle cx="20" cy="20" r="13" fill="none" stroke="url(#logo-wheel)" stroke-width="3.6" />
          <!-- yuqori belgisi (sport rul kabi) -->
          <path d="M18 6.4 h4" stroke="#ef4444" stroke-width="3.6" stroke-linecap="butt" />
          <!-- yon kegaylar -->
          <path d="M8 18.5 Q14 16.5 16.6 19" fill="none" stroke="url(#logo-wheel)" stroke-width="3" stroke-linecap="round" />
          <path d="M32 18.5 Q26 16.5 23.4 19" fill="none" stroke="url(#logo-wheel)" stroke-width="3" stroke-linecap="round" />
          <!-- markaz -->
          <circle cx="20" cy="20" r="4" fill="url(#logo-wheel)" />
          <circle cx="20" cy="20" r="1.5" fill="#16181d" />
          <!-- pastga yo'l chizig'i -->
          <path d="M20 25.5 V33" stroke="#fde68a" stroke-width="2.2" stroke-dasharray="2.6 1.8" stroke-linecap="round" />
        </svg>
      </span>
      @if (withText()) {
        <span [class]="textWrapClasses()">
          <span class="font-display text-[15px] leading-none font-bold tracking-tight italic" [class]="primaryTextClass()">
            {{ firstHead() }}<span [class]="tailClass()">{{ firstTail() }}</span>
          </span>
          <span class="mt-1 text-[9.5px] leading-none font-semibold tracking-[0.42em] uppercase" [class]="secondaryTextClass()">
            {{ secondWord() }}
          </span>
        </span>
      }
    </span>
  `,
})
export class LogoMark {
  private readonly translate = inject(TranslateService);

  readonly size = input<'sm' | 'md'>('md');
  /** Belgining yonida brend yozuvi ham chiqsinmi. */
  readonly withText = input(false);
  /** 'auto' — mavzuga moslashadi, 'light' — har doim qorong'i fon ustida, 'dark' — har doim oq fon ustida. */
  readonly tone = input<'auto' | 'light' | 'dark'>('auto');
  /** Telefonda faqat belgi qolsin. */
  readonly hideTextOnMobile = input(false);

  private readonly words = computed(() => this.translate.t('common.brand').split(/\s+/));
  // "Avtotez" → "AVTO" + "TEZ" (oxirgi bo'g'in sariq)
  protected readonly firstHead = computed(() => this.words()[0].toUpperCase().slice(0, -3));
  protected readonly firstTail = computed(() => this.words()[0].toUpperCase().slice(-3));
  protected readonly secondWord = computed(() => this.words().slice(1).join(' '));

  protected readonly badgeClasses = computed(() => {
    const base =
      'inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-asphalt-700 to-asphalt-950 shadow-md shadow-black/30 ring-1 ring-road-400/40';
    return this.size() === 'sm' ? `${base} h-9 w-9` : `${base} h-10 w-10`;
  });

  protected readonly iconClasses = computed(() => (this.size() === 'sm' ? 'h-7 w-7' : 'h-8 w-8'));

  protected readonly textWrapClasses = computed(
    () => `flex-col ${this.hideTextOnMobile() ? 'hidden sm:flex' : 'flex'}`,
  );
  protected readonly primaryTextClass = computed(() =>
    ({ light: 'text-white', dark: 'text-slate-900', auto: 'text-slate-900 dark:text-white' })[this.tone()],
  );
  // Oq fonda sariq yaxshi o'qilmaydi — to'qroq sariq
  protected readonly tailClass = computed(() =>
    ({ light: 'text-road-400', dark: 'text-road-500', auto: 'text-road-500 dark:text-road-400' })[this.tone()],
  );
  protected readonly secondaryTextClass = computed(() =>
    ({ light: 'text-slate-400', dark: 'text-slate-500', auto: 'text-slate-500 dark:text-slate-400' })[this.tone()],
  );
}

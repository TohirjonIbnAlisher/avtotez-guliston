import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { LogoMark } from '../logo-mark/logo-mark';
import { ProfileMenu } from '../profile-menu/profile-menu';

interface NavPill {
  labelKey: string;
  route: string;
  /** Joriy manzil shu bo'limga tegishlimi. */
  match: (url: string) => boolean;
  /** Pastki paneldagi belgi (SVG path, 24×24). */
  icon: string;
}

/** Ilova ichidagi sahifalar (kabinet, testlar, progress, profil, admin) uchun yagona sarlavha. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, LogoMark, ProfileMenu],
  template: `
    <header class="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-asphalt-700 dark:bg-asphalt-900/95">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 sm:py-3">
        <a routerLink="/" class="flex shrink-0 items-center gap-2.5">
          <app-logo-mark size="sm" [withText]="true" [hideTextOnMobile]="true" />
        </a>

        <!-- planshet va kompyuter: bo'limlar sarlavhada; telefonda pastki panelda -->
        <nav class="hidden min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] sm:flex">
          @for (pill of pills; track pill.labelKey) {
            <a
              [routerLink]="pill.route"
              class="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition"
              [class]="pill.match(url()) ? 'bg-road-400/15 text-road-500 dark:text-road-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-asphalt-800'"
            >
              {{ translate.t(pill.labelKey) }}
            </a>
          }
        </nav>

        @if (auth.isAuthenticated()) {
          <app-profile-menu />
        } @else {
          <a routerLink="/login" class="shrink-0 rounded-lg bg-road-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-road-300">
            {{ translate.t('common.login') }}
          </a>
        }
      </div>
    </header>

    <!-- Telefon: mobil ilovalardagidek pastki navigatsiya paneli -->
    <nav
      data-bottom-nav
      class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-asphalt-700 dark:bg-asphalt-900/95"
      [attr.aria-label]="translate.t('common.menu')"
    >
      <div class="grid grid-cols-4">
        @for (pill of pills; track pill.labelKey) {
          <a
            [routerLink]="pill.route"
            class="flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[11px] font-semibold transition"
            [class]="pill.match(url()) ? 'text-road-500 dark:text-road-400' : 'text-slate-500 dark:text-slate-400'"
            [attr.aria-current]="pill.match(url()) ? 'page' : null"
          >
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path [attr.d]="pill.icon" />
            </svg>
            <span class="max-w-full truncate">{{ translate.t(pill.labelKey) }}</span>
          </a>
        }
      </div>
    </nav>
  `,
})
export class AppHeader {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly translate = inject(TranslateService);

  protected readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly pills: NavPill[] = [
    {
      labelKey: 'dashboard.nav.home',
      route: '/dashboard',
      match: (u) => u.startsWith('/dashboard'),
      icon: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
    },
    {
      labelKey: 'dashboard.nav.topics',
      route: '/tests/topics',
      match: (u) => u.startsWith('/tests/topics'),
      icon: 'M4 5h16M4 12h16M4 19h10',
    },
    {
      labelKey: 'dashboard.nav.tickets',
      route: '/tests/tickets',
      match: (u) => u.startsWith('/tests/tickets'),
      icon: 'M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 6v12',
    },
    {
      labelKey: 'dashboard.nav.tests',
      route: '/tests/all',
      match: (u) => u.startsWith('/tests') && !u.startsWith('/tests/topics') && !u.startsWith('/tests/tickets'),
      icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
    },
  ];
}

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
}

/** Ilova ichidagi sahifalar (kabinet, testlar, progress, profil, admin) uchun yagona sarlavha. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, LogoMark, ProfileMenu],
  template: `
    <header class="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-asphalt-700 dark:bg-asphalt-900/95">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a routerLink="/" class="flex shrink-0 items-center gap-2.5">
          <app-logo-mark size="sm" [withText]="true" [hideTextOnMobile]="true" />
        </a>

        <nav class="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
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
    { labelKey: 'dashboard.nav.home', route: '/dashboard', match: (u) => u.startsWith('/dashboard') },
    { labelKey: 'dashboard.nav.topics', route: '/tests/topics', match: (u) => u.startsWith('/tests/topics') },
    { labelKey: 'dashboard.nav.tickets', route: '/tests/tickets', match: (u) => u.startsWith('/tests/tickets') },
    {
      labelKey: 'dashboard.nav.tests',
      route: '/tests/all',
      match: (u) => u.startsWith('/tests') && !u.startsWith('/tests/topics') && !u.startsWith('/tests/tickets'),
    },
  ];
}

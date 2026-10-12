import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { ProfileMenu } from './shared/profile-menu/profile-menu';
import { AppHeader } from './shared/app-header/app-header';
import { LogoMark } from './shared/logo-mark/logo-mark';
import { LanguageService, LOCALE_OPTIONS } from './core/services/language.service';
import { TranslateService } from './core/services/translate.service';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { SessionService } from './core/services/session.service';

interface NavLink {
  labelKey: string;
  fragment?: string;
  route: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, LogoMark, ProfileMenu, AppHeader],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);
  protected readonly translate = inject(TranslateService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  // Faolsizlik bo'yicha chiqish va token yangilash ilova ishga tushishi bilan boshlanadi.
  private readonly session = inject(SessionService);
  protected readonly localeOptions = LOCALE_OPTIONS;

  protected readonly title = signal('frontend');
  protected readonly mobileMenuOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Ilova ichidagi sahifalarda (kabinet, testlar, progress, profil, admin) yagona sarlavha; landing va login'da — sayt sarlavhasi. */
  protected readonly useAppHeader = computed(() =>
    ['/dashboard', '/tests', '/progress', '/profile', '/admin'].some((prefix) => this.currentUrl().startsWith(prefix)),
  );

  protected readonly isAppRoute = computed(
    () => this.currentUrl().startsWith('/dashboard') || this.currentUrl().startsWith('/tests'),
  );

  protected readonly navLinks: NavLink[] = [
    { labelKey: 'nav.home', route: '/', fragment: 'home' },
    { labelKey: 'nav.tests', route: '/tests' },
    { labelKey: 'nav.materials', route: '/', fragment: 'platform' },
    { labelKey: 'nav.results', route: '/', fragment: 'testimonials' },
    { labelKey: 'nav.aboutUs', route: '/', fragment: 'why-us' },
    { labelKey: 'nav.contact', route: '/', fragment: 'contact' },
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { LogoMark } from './shared/logo-mark/logo-mark';
import { LanguageService, LOCALE_OPTIONS } from './core/services/language.service';
import { TranslateService } from './core/services/translate.service';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';

interface NavLink {
  labelKey: string;
  fragment?: string;
  route: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, LogoMark],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);
  protected readonly translate = inject(TranslateService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
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

  protected readonly isDashboardRoute = computed(() =>
    this.currentUrl().startsWith('/dashboard'),
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

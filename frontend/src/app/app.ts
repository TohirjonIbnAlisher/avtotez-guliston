import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { LogoMark } from './shared/logo-mark/logo-mark';
import { LanguageService, LOCALE_OPTIONS } from './core/services/language.service';

interface NavLink {
  label: string;
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

  protected readonly navLinks: NavLink[] = [
    { label: 'Asosiy', route: '/', fragment: 'home' },
    { label: 'Testlar', route: '/tests' },
    { label: "O'quv materiallari", route: '/', fragment: 'platform' },
    { label: 'Natijalar', route: '/', fragment: 'testimonials' },
    { label: 'Biz haqimizda', route: '/', fragment: 'why-us' },
    { label: 'Kontakt', route: '/', fragment: 'contact' },
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}

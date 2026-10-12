import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService, LOCALE_OPTIONS } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslateService } from '../../core/services/translate.service';
import { UserAvatar } from '../user-avatar/user-avatar';

/** Sarlavhadagi profil tugmasi va ochiladigan menyu: profil, til, fon rejimi, boshqaruv paneli, chiqish. */
@Component({
  selector: 'app-profile-menu',
  imports: [RouterLink, UserAvatar],
  templateUrl: './profile-menu.html',
})
export class ProfileMenu {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly language = inject(LanguageService);
  protected readonly theme = inject(ThemeService);
  protected readonly translate = inject(TranslateService);
  protected readonly localeOptions = LOCALE_OPTIONS;

  readonly open = signal(false);

  protected readonly user = this.auth.currentUser;
  protected readonly name = computed(
    () => this.user()?.fullName || this.user()?.phone || this.translate.t('dashboard.userNamePlaceholder'),
  );
  protected readonly isStaff = computed(() => ['admin', 'superadmin'].includes(this.user()?.role ?? ''));
  protected readonly roleLabel = computed(() => this.translate.t(`dashboard.role.${this.user()?.role ?? 'user'}`));

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  logout(): void {
    this.close();
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}

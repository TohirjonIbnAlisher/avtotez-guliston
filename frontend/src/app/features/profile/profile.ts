import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService, LOCALE_OPTIONS } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { TranslateService } from '../../core/services/translate.service';
import { ProgressService } from '../../core/services/progress.service';
import { DAILY_GOAL_OPTIONS, TestPreferencesService } from '../../core/services/test-preferences.service';
import { UserAvatar } from '../../shared/user-avatar/user-avatar';

const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type Notice = { kind: 'ok' | 'error'; text: string } | null;

@Component({
  selector: 'app-profile-page',
  imports: [RouterLink, UserAvatar],
  templateUrl: './profile.html',
})
export class ProfilePage {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly language = inject(LanguageService);
  protected readonly theme = inject(ThemeService);
  protected readonly translate = inject(TranslateService);
  protected readonly prefs = inject(TestPreferencesService);
  private readonly progress = inject(ProgressService);

  protected readonly localeOptions = LOCALE_OPTIONS;
  protected readonly goalOptions = DAILY_GOAL_OPTIONS;

  protected readonly user = this.auth.currentUser;
  protected readonly isStaff = computed(() => ['admin', 'superadmin'].includes(this.user()?.role ?? ''));
  protected readonly roleLabel = computed(() => this.translate.t(`dashboard.role.${this.user()?.role ?? 'user'}`));
  protected readonly memberSince = computed(() => {
    const iso = this.user()?.createdAt;
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  });

  // ---- ism
  readonly name = signal(this.user()?.fullName ?? '');
  readonly nameSaving = signal(false);
  readonly nameNotice = signal<Notice>(null);
  protected readonly nameChanged = computed(() => this.name().trim() !== (this.user()?.fullName ?? ''));

  saveName(): void {
    const value = this.name().trim().replace(/\s+/g, ' ');
    if (value.length < 2) {
      this.nameNotice.set({ kind: 'error', text: this.translate.t('profile.personal.nameShort') });
      return;
    }
    this.nameSaving.set(true);
    this.nameNotice.set(null);
    this.auth.updateProfile(value).subscribe({
      next: () => {
        this.nameSaving.set(false);
        this.name.set(value);
        this.nameNotice.set({ kind: 'ok', text: this.translate.t('profile.personal.saved') });
      },
      error: (err) => {
        this.nameSaving.set(false);
        this.nameNotice.set({ kind: 'error', text: this.errorText(err) });
      },
    });
  }

  // ---- rasm
  readonly avatarBusy = signal(false);
  readonly avatarNotice = signal<Notice>(null);

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      this.avatarNotice.set({ kind: 'error', text: this.translate.t('profile.avatar.badType') });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      this.avatarNotice.set({ kind: 'error', text: this.translate.t('profile.avatar.tooBig') });
      return;
    }
    this.avatarBusy.set(true);
    this.avatarNotice.set(null);
    this.auth.uploadAvatar(file).subscribe({
      next: () => this.avatarBusy.set(false),
      error: (err) => {
        this.avatarBusy.set(false);
        this.avatarNotice.set({ kind: 'error', text: this.errorText(err) });
      },
    });
  }

  removeAvatar(): void {
    this.avatarBusy.set(true);
    this.avatarNotice.set(null);
    this.auth.removeAvatar().subscribe({
      next: () => this.avatarBusy.set(false),
      error: (err) => {
        this.avatarBusy.set(false);
        this.avatarNotice.set({ kind: 'error', text: this.errorText(err) });
      },
    });
  }

  // ---- parol
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly showPasswords = signal(false);
  readonly passwordSaving = signal(false);
  readonly passwordNotice = signal<Notice>(null);

  changePassword(): void {
    if (this.newPassword().length < 6) {
      this.passwordNotice.set({ kind: 'error', text: this.translate.t('profile.password.short') });
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordNotice.set({ kind: 'error', text: this.translate.t('profile.password.mismatch') });
      return;
    }
    this.passwordSaving.set(true);
    this.passwordNotice.set(null);
    this.auth.changePassword(this.currentPassword(), this.newPassword()).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.passwordNotice.set({ kind: 'ok', text: this.translate.t('profile.password.done') });
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordNotice.set({ kind: 'error', text: this.errorText(err) });
      },
    });
  }

  // ---- xavfli amallar
  resetProgress(): void {
    if (confirm(this.translate.t('dashboard.progress.resetConfirm'))) {
      this.progress.resetProgress();
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }

  private errorText(err: unknown): string {
    const message = err instanceof HttpErrorResponse ? err.error?.message : null;
    if (Array.isArray(message)) return message[0];
    return typeof message === 'string' ? message : this.translate.t('profile.error');
  }
}

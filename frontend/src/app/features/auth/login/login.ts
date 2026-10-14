import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LogoMark } from '../../../shared/logo-mark/logo-mark';
import { TranslateService } from '../../../core/services/translate.service';
import { AuthService } from '../../../core/services/auth.service';
import { normalizePhone } from '../../../core/utils/phone.util';

@Component({
  selector: 'app-login',
  imports: [RouterLink, LogoMark],
  templateUrl: './login.html',
})
export class Login {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  protected readonly translate = inject(TranslateService);

  readonly phone = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Avtomatik chiqish sababi (?reason=idle|expired|replaced). */
  readonly notice = signal<string | null>(this.reasonNotice(this.route.snapshot.queryParamMap.get('reason')));

  private reasonNotice(reason: string | null): string | null {
    if (reason === 'idle') return this.translate.t('login.sessionIdle');
    if (reason === 'expired') return this.translate.t('login.sessionExpired');
    if (reason === 'replaced') return this.translate.t('login.sessionReplaced');
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (!this.phone() || !this.password()) {
      this.error.set(this.translate.t('login.errorRequired'));
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.notice.set(null);

    this.auth.login(normalizePhone(this.phone()), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? this.translate.t('login.errorInvalid'));
      },
    });
  }
}

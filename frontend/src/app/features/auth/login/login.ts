import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LogoMark } from '../../../shared/logo-mark/logo-mark';

@Component({
  selector: 'app-login',
  imports: [RouterLink, LogoMark],
  templateUrl: './login.html',
})
export class Login {
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  onSubmit(): void {
    if (!this.email() || !this.password()) {
      this.error.set('Login va parolni kiriting.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // TODO: backend'da /auth/login endpoint tayyor bo'lgach haqiqiy autentifikatsiya bilan almashtiriladi
    setTimeout(() => {
      this.loading.set(false);
      this.router.navigateByUrl('/dashboard');
    }, 500);
  }
}

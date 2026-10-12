import { Component, computed, inject, input } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/** Foydalanuvchi rasmi; rasm yo'q bo'lsa — ismning bosh harfi. */
@Component({
  selector: 'app-user-avatar',
  template: `
    <span [class]="classes()">
      @if (auth.avatarSrc(); as src) {
        <img [src]="src" alt="" class="h-full w-full object-cover" />
      } @else {
        {{ initial() }}
      }
    </span>
  `,
})
export class UserAvatar {
  protected readonly auth = inject(AuthService);

  readonly size = input<'sm' | 'md' | 'xl'>('sm');

  protected readonly initial = computed(() => {
    const user = this.auth.currentUser();
    return (user?.fullName || user?.phone || '?').trim().charAt(0).toUpperCase();
  });

  protected readonly classes = computed(() => {
    const base =
      'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sign-blue to-indigo-700 font-display text-white ring-2 ring-white/80 dark:ring-asphalt-700';
    const size = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-lg', xl: 'h-28 w-28 text-4xl' }[this.size()];
    return `${base} ${size}`;
  });
}

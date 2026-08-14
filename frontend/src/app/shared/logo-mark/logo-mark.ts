import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-logo-mark',
  template: `
    <span [class]="badgeClasses()">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        [class]="iconClasses()"
      >
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="2.4" />
        <path d="M12 3.5v4.3" />
        <path d="M5.2 16.4l3.7-2.2" />
        <path d="M18.8 16.4l-3.7-2.2" />
      </svg>
    </span>
  `,
})
export class LogoMark {
  readonly size = input<'sm' | 'md'>('md');

  protected readonly badgeClasses = computed(() => {
    const base =
      'inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-600/30';
    return this.size() === 'sm' ? `${base} h-9 w-9` : `${base} h-10 w-10`;
  });

  protected readonly iconClasses = computed(() =>
    this.size() === 'sm' ? 'h-5 w-5' : 'h-6 w-6',
  );
}

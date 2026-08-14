import { Injectable, signal } from '@angular/core';

export type Locale = 'uz' | 'uzk' | 'ru';

export interface LocaleOption {
  code: Locale;
  label: string;
}

const STORAGE_KEY = 'avtotez-guliston-locale';

export const LOCALE_OPTIONS: LocaleOption[] = [
  { code: 'uz', label: "UZ" },
  { code: 'uzk', label: 'ЎЗ' },
  { code: 'ru', label: 'RU' },
];

function readStoredLocale(): Locale {
  if (typeof localStorage === 'undefined') {
    return 'uz';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'uz' || stored === 'uzk' || stored === 'ru' ? stored : 'uz';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly locale = signal<Locale>(readStoredLocale());

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageService } from './language.service';

function resolve(tree: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((node, segment) => {
    if (node && typeof node === 'object') {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, tree);
}

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly languageService = inject(LanguageService);

  t(path: string, params?: Record<string, string | number>): string {
    const value =
      resolve(TRANSLATIONS[this.languageService.locale()], path) ??
      resolve(TRANSLATIONS.uz, path);

    if (typeof value !== 'string') {
      return path;
    }

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce(
      (text, [key, val]) => text.replaceAll(`{${key}}`, String(val)),
      value,
    );
  }

  array<T = string>(path: string): T[] {
    const value =
      resolve(TRANSLATIONS[this.languageService.locale()], path) ??
      resolve(TRANSLATIONS.uz, path);
    return Array.isArray(value) ? (value as T[]) : [];
  }
}

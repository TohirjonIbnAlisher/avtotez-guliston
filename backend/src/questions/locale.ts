import { BadRequestException } from '@nestjs/common';

export type Locale = 'uz' | 'uzk' | 'ru';

export const LOCALES: Locale[] = ['uz', 'uzk', 'ru'];

export const DEFAULT_LOCALE: Locale = 'uz';

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

export type LocalizedText = Record<Locale, string>;
export type LocalizedOptions = Record<Locale, string[]>;
export type LocalizedExplanation = Partial<Record<Locale, string | null>>;

/** So'rovdagi `lang` parametrini tekshiradi (berilmasa — o'zbekcha). */
export function parseLocaleParam(lang?: string): Locale {
  if (!lang) {
    return DEFAULT_LOCALE;
  }
  if (!isLocale(lang)) {
    throw new BadRequestException(`Noto'g'ri til kodi: ${lang}. Ruxsat etilgan: uz, uzk, ru`);
  }
  return lang;
}

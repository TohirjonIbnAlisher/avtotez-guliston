export type Locale = 'uz' | 'uzk' | 'ru';

export const LOCALES: Locale[] = ['uz', 'uzk', 'ru'];

export const DEFAULT_LOCALE: Locale = 'uz';

export function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

export type LocalizedText = Record<Locale, string>;
export type LocalizedOptions = Record<Locale, string[]>;
export type LocalizedExplanation = Partial<Record<Locale, string | null>>;

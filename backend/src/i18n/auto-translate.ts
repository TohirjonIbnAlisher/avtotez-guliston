import { ServiceUnavailableException } from '@nestjs/common';
import { uzLatinToCyrillic } from './uz-translit';

// Admin faqat o'zbekcha (lotin) kiritadi — kirillcha qoidaga ko'ra o'giriladi, ruscha mashina tarjimasi bilan.

export interface LocaleTriple {
  uz: string;
  uzk: string;
  ru: string;
}

// Google'ning brauzer kengaytmasi manzili (kalitsiz; translate.googleapis.com Node so'rovlarini 429 bilan bloklaydi).
const GOOGLE_URL = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=uz&tl=ru';
// Zaxira: MyMemory (kalitsiz, bitta so'rovda 500 baytgacha)
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get?langpair=uz|ru';
const MYMEMORY_MAX_BYTES = 500;
const TIMEOUT_MS = 20_000;
const BATCH_CHARS = 4_000;
const RETRY_DELAYS_MS = [1_000, 3_000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Atamalar: "YHQ" qisqartmasini tarjimon tanimaydi — to'liq yoziladi, natijada "ПДД" ga qaytariladi.
const preprocess = (text: string) => text.replace(/\bYHQ\b/g, "Yo'l harakati qoidalari (YHQ)");
// YHQ bo'linmalari — "band" = "пункт" (tarjimon "статья" deb beradi)
const PUNKT_FORMS: Record<string, string> = { я: 'пункт', и: 'пункта', е: 'пункту', ю: 'пункт', ей: 'пунктом', ёй: 'пунктом' };
const fixPunkt = (text: string) =>
  /ПДД/.test(text) ? text.replace(/стать(я|и|е|ю|ей|ёй)(?=\s+\d)/g, (_, end: string) => PUNKT_FORMS[end]) : text;

const postprocess = (text: string) =>
  fixPunkt(
    text
      .replace(/(правил[а-яё]*|кодекс[а-яё]*) дорожного движения( Республики Узбекистан)?/gi, 'ПДД')
      .replace(/ПДД\s*\((ПДД|YHQ|ЙҲҚ)\)/g, 'ПДД')
      .replace(/\((ПДД|YHQ)\)/g, '')
      .replace(/\bYHQ\b/g, 'ПДД')
      .replace(/ {2,}/g, ' '),
  );

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if ((res.status === 429 || res.status >= 500) && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (!res.ok) {
      throw new Error(`tarjima xizmati javobi: ${res.status}`);
    }
    return res;
  }
}

/** Bir nechta matnni bitta so'rovda tarjima qiladi. */
async function googleBatch(texts: string[]): Promise<string[]> {
  const body = new URLSearchParams();
  texts.forEach((t) => body.append('q', t));
  const res = await fetchWithRetry(GOOGLE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: body.toString(),
  });
  // javob: ["tarjima", ...] (ba'zan har biri ["tarjima", "til"] ko'rinishida)
  const data = (await res.json()) as Array<string | [string, ...unknown[]]>;
  const out = data.map((item) => (Array.isArray(item) ? item[0] : item));
  if (out.length !== texts.length || out.some((t) => typeof t !== 'string' || !t.trim())) {
    throw new Error("tarjima xizmati kutilmagan javob qaytardi");
  }
  return out;
}

async function myMemoryOne(text: string): Promise<string> {
  if (Buffer.byteLength(text) > MYMEMORY_MAX_BYTES) {
    throw new Error('matn zaxira xizmat uchun juda uzun');
  }
  const res = await fetchWithRetry(`${MYMEMORY_URL}&q=${encodeURIComponent(text)}`, { method: 'GET' });
  const data = (await res.json()) as { responseStatus: number; responseData?: { translatedText?: string } };
  const translated = data.responseData?.translatedText;
  if (data.responseStatus !== 200 || !translated?.trim()) {
    throw new Error('zaxira tarjima xizmati javob bermadi');
  }
  return translated;
}

async function translateChunk(texts: string[]): Promise<string[]> {
  try {
    return await googleBatch(texts);
  } catch (primaryError) {
    try {
      const out: string[] = [];
      for (const t of texts) {
        out.push(await myMemoryOne(t));
      }
      return out;
    } catch {
      throw primaryError;
    }
  }
}

/** Bir nechta matnni o'zbekchadan ruschaga tarjima qiladi (bo'shlari bo'sh qoladi). */
export async function translateToRussian(texts: string[]): Promise<string[]> {
  const out = [...texts];
  const pending = texts.map((t, i) => ({ t: preprocess(t), i })).filter(({ t }) => t.trim());
  try {
    // so'rov hajmi cheklangan — bo'laklab yuboriladi
    for (let start = 0; start < pending.length; ) {
      let end = start + 1;
      let size = pending[start].t.length;
      while (end < pending.length && size + pending[end].t.length <= BATCH_CHARS) {
        size += pending[end++].t.length;
      }
      const chunk = pending.slice(start, end);
      const translated = await translateChunk(chunk.map(({ t }) => t));
      chunk.forEach(({ i }, k) => (out[i] = postprocess(translated[k])));
      start = end;
    }
    return out;
  } catch (err) {
    throw new ServiceUnavailableException(
      `Ruscha tarjima qilib bo'lmadi (${(err as Error).message}). Ruscha matnni qo'lda kiriting yoki keyinroq urinib ko'ring.`,
    );
  }
}

const blank = (v: string | null | undefined): boolean => !v || !v.trim();

/**
 * Har bir yozuvning bo'sh qolgan kirillcha va ruscha qiymatlarini o'zbekchasidan to'ldiradi.
 * Qo'lda kiritilgan qiymatlar o'zgarmaydi.
 */
export async function completeLocales(
  items: Array<{ uz: string; uzk?: string | null; ru?: string | null }>,
): Promise<LocaleTriple[]> {
  const needRu = items.map((it, i) => ({ it, i })).filter(({ it }) => blank(it.ru) && !blank(it.uz));
  const ru = await translateToRussian(needRu.map(({ it }) => it.uz));
  const ruByIndex = new Map(needRu.map(({ i }, k) => [i, ru[k]]));
  return items.map((it, i) => ({
    uz: it.uz,
    uzk: blank(it.uzk) ? uzLatinToCyrillic(it.uz ?? '') : it.uzk!,
    ru: ruByIndex.get(i) ?? it.ru ?? '',
  }));
}

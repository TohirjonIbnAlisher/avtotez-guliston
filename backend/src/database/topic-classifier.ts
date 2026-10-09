// Savolni mavzuga biriktirish: izoh (description) dagi YHQ havolasi bo'yicha.
//
// Band oraliqlari lex.uz'dagi amaldagi YHQ (VM 24.12.2015 y. 370-son qarori, 1-ilova) boblaridan olingan.
// Izohlardagi bob raqami ba'zan xato yozilgan, band raqami esa ishonchli — shuning uchun band asos qilinadi.
// Izohda bir nechta havola bo'lsa, birinchi tilga olingani hal qiluvchi.

const SIGN_SECTIONS: Record<number, string> = {
  1: 'Ogohlantiruvchi belgilar',
  2: 'Imtiyoz belgilari',
  3: 'Taqiqlovchi belgilar',
  4: 'Buyuruvchi belgilar',
  5: "Axborot-ko'rsatkich belgilar",
  6: 'Servis belgilari',
  7: "Qo'shimcha axborot belgilari",
};

const VEHICLE_BANS = 'Transport vositalaridan foydalanishni taqiqlovchi shartlar';
const SAFETY_BASICS = 'Harakat xavfsizligi asoslari';
const FIRST_AID = 'Birinchi tibbiy yordam';
// YHQ XXIX bob: taniqlik belgilari, transportni yo'lga chiqarish va mas'ul shaxslar majburiyatlari
const OFFICIALS_DUTIES =
  "Mansabdor shaxslarning va fuqarolarning yo'l harakati xavfsizligini ta'minlash, transport vositalarini yo'lga chiqarish, raqam va taniqli belgilarini o'rnatish bo'yicha majburiyatlari";

// [birinchi band, oxirgi band, mavzu]
const BAND_RANGES: [number, number, string][] = [
  [1, 6, 'Umumiy qoidalar'],
  [7, 14, 'Haydovchilarning umumiy vazifalari'], // II–III boblar (YTH bo'lganda haydovchi majburiyatlari ham shu yerda)
  [15, 22, 'Piyodalarning umumiy vazifalari'],
  [23, 24, 'Umumiy qoidalar'], // V bob — yo'lovchilar majburiyatlari
  [25, 29, 'Maxsus transport vositalarining imtiyozlari'],
  [30, 37, 'Svetofor ishoralari'],
  [38, 43, 'Tartibga soluvchining ishoralari'],
  [44, 52, 'Ogohlantiruvchi va avariya ishoralari'],
  [53, 63, 'Harakatlanishni boshlash, manyovr qilish'],
  [64, 76, "Yo'lning qatnov qismida transport vositalarining joylashuvi"],
  [77, 81, 'Harakatlanish tezligi'],
  [82, 87, "Quvib o'tish"],
  [88, 95, "To'xtash va to'xtab turish"],
  [96, 98, 'Chorrahalarda harakatlanish'],
  [99, 103, 'Tartibga solingan chorrahalar'],
  [104, 104, "Tartibga solinmagan chorrahalar (asosiy yo'l to'g'ri yo'nalishda)"],
  [105, 105, 'Tartibga solinmagan teng ahamiyatli chorrahalar'],
  [106, 106, "Tartibga solinmagan chorrahalar (asosiy yo'l yo'nalishi o'zgarishi)"],
  [107, 108, 'Tartibga solinmagan teng ahamiyatli chorrahalar'],
  [109, 115, "Piyodalar o'tish joylari va yo'nalishli transport vositalari bekatlari"],
  [116, 120, "Temir yo'l kesishmalari orqali harakatlanish"],
  [121, 122, 'Avtomagistrallarda harakatlanish'],
  [123, 127, 'Turar joy dahalarida harakatlanish'],
  [128, 130, 'Tik balandlik va nishabliklarda harakatlanish'],
  [131, 133, "Yo'nalishli transport vositalarining imtiyozlari"],
  [134, 141, 'Tashqi yoritish asboblaridan foydalanish'],
  [142, 145, 'Mexanik transport vositalarini shatakka olish'],
  [146, 151, "Transport vositalarini boshqarishni o'rgatish"],
  [152, 159, 'Odam tashish'],
  [160, 164, 'Yuk tashish'],
  [
    165,
    173,
    "Velosiped, moped va aravalar harakatlanishiga hamda hayvonlarni haydab o'tishga doir qo'shimcha talablar",
  ],
  // XXIX bob: taniqlik belgilari, shatakka olish qurilmalari, foydalanish taqiqlanadigan hollar, mas'ul shaxslar
  [174, 176, OFFICIALS_DUTIES],
  [177, 178, 'Mexanik transport vositalarini shatakka olish'],
  [179, 179, VEHICLE_BANS],
  [180, 186, SAFETY_BASICS],
];

const APOSTROPHE = "[ʻ'`’‘]?";
const ANNEX_RE = new RegExp(`(\\d)\\s*-\\s*ilova\\w*(?:\\s+(\\d)\\s*-\\s*bo${APOSTROPHE}lim)?`, 'g');
const BAND_RE = /(?<![\d.])(\d{1,3})(?:\s*,\s*\d{1,3})*\s*-\s*band/g;
const SIGN_NUMBER_RE = /(?<![\d.])([1-7])\.\d{1,2}(?:\.\d{1,2})?(?!\d)/;
// Faqat savol matnida qidiriladi: izohlarda "shina", "tormoz yo'li" kabi so'zlar boshqa ma'noda keladi.
const FIRST_AID_RE =
  /tibbiy|jarohat|jabrlanuvchi|yarador|shikastlan|singan|suyag|kuyish|reanimats|jonlantir|yurak|nafas ol|xushsiz|hushsiz|bint|jgut|zaharlan|yod |lat ye|qon (ket|oq|to)/i;

export type ClassifySource = 'manual' | 'band' | 'annex' | 'first-aid' | 'sign-number' | 'marking' | 'fallback';

export interface Classification {
  topic: string;
  source: ClassifySource;
}

function topicByBand(band: number): string | null {
  const range = BAND_RANGES.find(([from, to]) => band >= from && band <= to);
  return range ? range[2] : null;
}

function topicByAnnex(annex: number, section: number | null): string | null {
  switch (annex) {
    case 1:
      return section ? (SIGN_SECTIONS[section] ?? null) : null;
    case 2:
      return section === 2 ? 'Tik chiziqlar' : 'Yotiq chiziqlar';
    case 3:
      return VEHICLE_BANS;
    case 4:
      return OFFICIALS_DUTIES;
    default:
      return null;
  }
}

// Izohida YHQ havolasi yo'q va kalit so'zlar bo'yicha noto'g'ri tushadigan savollar (manba id → mavzu).
const MANUAL_TOPIC_FIXES: Record<number, string> = {
  58: 'Ogohlantiruvchi va avariya ishoralari', // ogohlantirish ishorasini berish talabi
  60: VEHICLE_BANS, // shina protektori qoldiq balandligi
  252: "Quvib o'tish",
  361: 'Avtomagistrallarda harakatlanish',
  437: 'Chorrahalarda harakatlanish',
};

export function classifyQuestion(
  sourceId: number,
  question: string,
  description: string | null | undefined,
): Classification {
  const manual = MANUAL_TOPIC_FIXES[sourceId];
  if (manual) {
    return { topic: manual, source: 'manual' };
  }

  const text = (description ?? '').replace(/\s+/g, ' ');

  const candidates: { index: number; topic: string; source: ClassifySource }[] = [];
  for (const m of text.matchAll(ANNEX_RE)) {
    const topic = topicByAnnex(Number(m[1]), m[2] ? Number(m[2]) : null);
    if (topic) candidates.push({ index: m.index, topic, source: 'annex' });
  }
  for (const m of text.matchAll(BAND_RE)) {
    const topic = topicByBand(Number(m[1]));
    if (topic) candidates.push({ index: m.index, topic, source: 'band' });
  }
  if (candidates.length) {
    const first = candidates.reduce((a, b) => (b.index < a.index ? b : a));
    return { topic: first.topic, source: first.source };
  }

  if (FIRST_AID_RE.test(question)) {
    return { topic: FIRST_AID, source: 'first-aid' };
  }
  const sign = text.match(SIGN_NUMBER_RE);
  if (sign && /belgi/i.test(text)) {
    return { topic: SIGN_SECTIONS[Number(sign[1])], source: 'sign-number' };
  }
  if (/chiziq/i.test(question)) {
    return { topic: 'Yotiq chiziqlar', source: 'marking' };
  }
  // Havolasiz qolganlari asosan avtomobil dinamikasi, tormozlash, haydovchi holati haqida.
  return { topic: SAFETY_BASICS, source: 'fallback' };
}

/** Tasniflagich qaytarishi mumkin bo'lgan barcha mavzu nomlari (katalog bilan solishtirish uchun). */
export const CLASSIFIER_TOPICS: string[] = [
  ...new Set([
    ...Object.values(SIGN_SECTIONS),
    ...BAND_RANGES.map((r) => r[2]),
    'Tik chiziqlar',
    'Yotiq chiziqlar',
    VEHICLE_BANS,
    OFFICIALS_DUTIES,
    FIRST_AID,
    SAFETY_BASICS,
    ...Object.values(MANUAL_TOPIC_FIXES),
  ]),
];

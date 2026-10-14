// O'zbek lotin yozuvidan kirill yozuviga avtomatik o'girish (qoidaga asoslangan, tarmoqsiz).
// Admin faqat lotincha kiritganda kirillcha matn shu bilan to'ldiriladi.

const APOSTROPHES = new Set(["'", 'ʻ', 'ʼ', '‘', '’', '`']);
const VOWELS = new Set([...'aeiouAEIOU']);

const SINGLE: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л',
  m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х',
  y: 'й', z: 'з',
};

// y + unli → yotlangan harf (yo, yu, ya, ye)
const IOTATED: Record<string, string> = { o: 'ё', u: 'ю', a: 'я', e: 'е' };

const isLetter = (ch: string | undefined): boolean => !!ch && /\p{L}/u.test(ch);
const isUpper = (ch: string): boolean => ch !== ch.toLowerCase();
const isApos = (ch: string | undefined): boolean => !!ch && APOSTROPHES.has(ch);

// "ts" → "ц" bo'ladigan o'zlashma qismlar (qolgan "ts" — o'zbekcha qo'shimcha: ketsa, aytsin)
const TSE_PARTS = /^ts(iya|ion|ient|iyent|ikl|ilindr|ement|entr|ex|isterna|irk|ifr)/i;

function isTseLoan(s: string, i: number): boolean {
  // so'z boshidagi "ts" (o'zbekcha so'zlarda uchramaydi) yoki ma'lum o'zlashma qismlar
  return !isLetter(s[i - 1]) || TSE_PARTS.test(s.slice(i, i + 12));
}

/** Natijaning bosh/kichik harfligi: "SH" va "Sh" → "Ш", "sh" → "ш". */
function withCase(cyr: string, source: string): string {
  return isUpper(source[0]) ? cyr.toUpperCase() : cyr;
}

export function uzLatinToCyrillic(input: string): string {
  if (!input) {
    return input;
  }
  let out = '';
  const s = input;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const lower = ch.toLowerCase();
    const next = s[i + 1]?.toLowerCase();
    const prev = s[i - 1];

    if (!(lower in SINGLE)) {
      // tutuq belgisi (ta'lim → таълим) — faqat ikki harf orasida; qolganlari (qo'shtirnoq) o'zgarmaydi
      if (isApos(ch) && isLetter(prev) && isLetter(s[i + 1])) {
        out += 'ъ';
      } else {
        out += ch;
      }
      continue;
    }

    // o' → ў, g' → ғ
    if ((lower === 'o' || lower === 'g') && isApos(s[i + 1])) {
      out += withCase(lower === 'o' ? 'ў' : 'ғ', ch);
      i++;
      continue;
    }
    // sh → ш, ch → ч (s'h → сҳ — apostrof bilan ajratilgan)
    if ((lower === 's' || lower === 'c') && next === 'h') {
      out += withCase(lower === 's' ? 'ш' : 'ч', ch);
      i++;
      continue;
    }
    // ts → ц o'zlashma so'zlarda (mototsikl, stansiya emas — stantsiya, koeffitsient); fe'llarda (ketsa) — тс
    if (lower === 't' && next === 's' && isTseLoan(s, i)) {
      out += withCase('ц', ch);
      i++;
      continue;
    }
    // "yo'" — й + ў (yo'l → йўл), boshqa hollarda yotlangan harf
    if (lower === 'y' && next && next in IOTATED && !(next === 'o' && isApos(s[i + 2]))) {
      // undoshdan keyingi "ye" — ajratish belgisi bilan (obyekt → объект)
      const sep = next === 'e' && isLetter(prev) && !VOWELS.has(prev) ? 'ъ' : '';
      out += sep + withCase(IOTATED[next], ch);
      i++;
      continue;
    }
    // e: so'z boshida yoki unlidan keyin → э
    if (lower === 'e' && (!isLetter(prev) || VOWELS.has(prev))) {
      out += withCase('э', ch);
      continue;
    }
    out += withCase(SINGLE[lower], ch);
  }
  return out;
}

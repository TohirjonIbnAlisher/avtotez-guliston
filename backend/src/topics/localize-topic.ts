import { Locale } from '../questions/locale';
import { completeLocales } from '../i18n/auto-translate';
import { glossaryRu } from '../i18n/ru-glossary';
import { Topic, TopicTexts, TopicTranslations } from './entities/topic.entity';

export type LocalizedTopic = Omit<Topic, 'translations' | 'questions'>;

/** Mavzuni so'ralgan tilda qaytaradi (tarjima bo'lmasa — o'zbekcha). */
export function localizeTopic<T extends Topic | null | undefined>(topic: T, lang: Locale): T {
  if (!topic) {
    return topic;
  }
  const { translations, ...rest } = topic;
  const tr = lang === 'uz' ? undefined : translations?.[lang];
  return {
    ...rest,
    name: tr?.name || topic.name,
    description: tr?.description ?? topic.description,
    category: tr?.category ?? topic.category,
  } as T;
}

/** O'zbekcha nom/izoh/toifadan kirillcha va ruscha ko'rinishlarni yaratadi. */
export async function buildTopicTranslations(
  topic: Pick<Topic, 'name' | 'description' | 'category'>,
): Promise<TopicTranslations> {
  const fields = [topic.name, topic.description ?? '', topic.category ?? ''];
  // rasmiy nomlar lug'atdan, qolganlari tarjima qilinadi
  const [name, description, category] = await completeLocales(fields.map((uz) => ({ uz, ru: glossaryRu(uz) })));
  const pick = (lang: 'uzk' | 'ru') => ({
    name: name[lang],
    description: topic.description ? description[lang] : null,
    category: topic.category ? category[lang] : null,
  });
  return { uzk: pick('uzk'), ru: pick('ru') };
}

/** Admin qo'lda kiritgan (bo'sh bo'lmagan) tarjimalarni avtomatik yaratilganlar ustiga qo'yadi. */
export function mergeTopicTranslations(
  base: TopicTranslations,
  manual: Partial<Record<'uzk' | 'ru', Partial<TopicTexts>>> | undefined,
): TopicTranslations {
  const out: TopicTranslations = { ...base };
  for (const lang of ['uzk', 'ru'] as const) {
    const given = manual?.[lang];
    if (!given) {
      continue;
    }
    const current: TopicTexts = out[lang] ?? { name: '', description: null, category: null };
    const pick = (key: keyof TopicTexts) => given[key]?.trim() || current[key];
    out[lang] = { name: pick('name') ?? '', description: pick('description'), category: pick('category') };
  }
  return out;
}

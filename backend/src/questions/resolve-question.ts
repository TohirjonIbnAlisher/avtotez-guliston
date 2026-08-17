import { Question } from './entities/question.entity';
import { DEFAULT_LOCALE, Locale } from './locale';

export interface ResolvedQuestion {
  id: string;
  sourceId: number | null;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageUrl: string | null;
  explanation: string | null;
  isTricky: boolean;
  isNumberRelated: boolean;
  topic: Question['topic'];
}

export function resolveQuestion(question: Question, lang: Locale): ResolvedQuestion {
  const fallback = DEFAULT_LOCALE;
  return {
    id: question.id,
    sourceId: question.sourceId,
    text: question.text[lang] ?? question.text[fallback],
    options: question.options[lang] ?? question.options[fallback],
    correctOptionIndex: question.correctOptionIndex,
    imageUrl: question.imageUrl,
    explanation:
      question.explanation?.[lang] ?? question.explanation?.[fallback] ?? null,
    isTricky: question.isTricky,
    isNumberRelated: question.isNumberRelated,
    topic: question.topic,
  };
}

import { environment } from '../../../environments/environment';
import { Question } from '../models/question.model';

const absolute = (url: string | null): string | null =>
  url && !/^https?:\/\//.test(url) ? `${environment.apiUrl}${url}` : url;

/** Backend qaytargan nisbiy media manzillarini (/media/...) to'liq manzilga aylantiradi. */
export function withAbsoluteMedia(question: Question): Question {
  return { ...question, imageUrl: absolute(question.imageUrl), videoUrl: absolute(question.videoUrl ?? null) };
}

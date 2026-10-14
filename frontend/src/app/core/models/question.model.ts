export interface TopicTexts {
  name: string;
  description: string | null;
  category: string | null;
}

export interface Topic extends TopicTexts {
  id: string;
  /** Faqat admin uchun (tilsiz so'rovda): kirillcha va ruscha ko'rinishlari. */
  translations?: Partial<Record<'uzk' | 'ru', TopicTexts>> | null;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageUrl: string | null;
  /** Javob belgilangandan keyin rasm o'rnida ko'rsatiladigan izoh-video. */
  videoUrl?: string | null;
  explanation: string | null;
  isTricky: boolean;
  isNumberRelated: boolean;
  topic: Topic | null;
  /** Mavzu ichidagi tartib raqami (1 dan). */
  topicOrder: number | null;
}

/** Biletlar ro'yxati uchun yengil ma'lumot (savollarsiz). */
export interface TicketSummary {
  id: string;
  number: number;
  questionCount: number;
}

export interface Ticket {
  id: string;
  number: number;
  questions: Question[];
}

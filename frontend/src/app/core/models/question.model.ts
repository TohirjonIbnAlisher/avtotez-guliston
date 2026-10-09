export interface Topic {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  imageUrl: string | null;
  explanation: string | null;
  isTricky: boolean;
  isNumberRelated: boolean;
  topic: Topic | null;
  /** Mavzu ichidagi tartib raqami (1 dan). */
  topicOrder: number | null;
}

export interface Ticket {
  id: string;
  number: number;
  questions: Question[];
}

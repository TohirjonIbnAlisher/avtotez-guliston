export interface Topic {
  id: string;
  name: string;
  description: string | null;
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
}

export interface Ticket {
  id: string;
  number: number;
  questions: Question[];
}

import { UserRole } from './user.model';

export interface AdminUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserPayload {
  phone: string;
  password: string;
  fullName?: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  phone?: string;
  password?: string;
  fullName?: string;
  role?: UserRole;
}

export type LocalizedField = Record<'uz' | 'uzk' | 'ru', string>;

export interface AdminQuestionPayload {
  text: LocalizedField;
  options: Record<'uz' | 'uzk' | 'ru', string[]>;
  correctOptionIndex: number;
  imageUrl?: string | null;
  topicId?: string | null;
}

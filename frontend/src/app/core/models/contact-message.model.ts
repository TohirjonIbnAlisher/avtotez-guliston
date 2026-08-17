export type ContactMessageStatus = 'new' | 'contacted';

export interface ContactMessage {
  id: string;
  fullName: string;
  phone: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
}

export interface CreateContactMessagePayload {
  fullName: string;
  phone: string;
  message: string;
}

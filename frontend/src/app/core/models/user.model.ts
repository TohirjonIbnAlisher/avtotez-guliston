export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: UserRole;
  /** Profil rasmi (backend'dagi nisbiy manzil, /media/avatars/...). */
  avatarUrl?: string | null;
  /** Ro'yxatdan o'tgan sana (ISO). */
  createdAt?: string;
}

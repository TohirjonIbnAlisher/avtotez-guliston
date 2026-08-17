export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: UserRole;
}

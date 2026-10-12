import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName: string | null;

  /** Profil rasmi (/media/avatars/...). */
  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

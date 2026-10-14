import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Refresh token'ning o'zi saqlanmaydi — faqat SHA-256 xeshi. Har ishlatilganda yangisiga almashtiriladi
// (rotatsiya); bitta login'dan chiqqan tokenlar zanjiri `familyId` bilan bog'langan.
@Entity('refresh_tokens')
@Index('IDX_refresh_tokens_user', ['userId'])
@Index('IDX_refresh_tokens_family', ['familyId'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 64, unique: true })
  tokenHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz' })
  lastUsedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Nima uchun bekor qilingan: 'replaced' — shu hisobga boshqa qurilmadan kirildi. */
  @Column({ name: 'revoked_reason', type: 'varchar', length: 20, nullable: true })
  revokedReason: string | null;

  @Column({ name: 'replaced_by_id', type: 'uuid', nullable: true })
  replacedById: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 300, nullable: true })
  userAgent: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

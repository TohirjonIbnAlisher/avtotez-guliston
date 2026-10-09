import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Foydalanuvchi faol bo'lgan kunlar (foydalanuvchining mahalliy sanasi, YYYY-MM-DD) — streak uchun.
@Entity('user_activity_days')
export class ActivityDay {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'date' })
  day: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

// Har bir bilet bo'yicha oxirgi natija.
@Entity('user_ticket_results')
export class TicketResult {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'ticket_number', type: 'int' })
  ticketNumber: number;

  @Column({ type: 'int' })
  correct: number;

  @Column({ type: 'int' })
  wrong: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

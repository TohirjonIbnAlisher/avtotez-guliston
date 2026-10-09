import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Question } from '../../questions/entities/question.entity';

export type AnswerStatus = 'correct' | 'wrong';

// Har bir (foydalanuvchi, savol) juftligi uchun bitta qator: oxirgi javob holati va "saqlangan" belgisi.
@Entity('user_question_progress')
export class QuestionProgress {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'question_id', type: 'uuid' })
  questionId: string;

  // null — savolga hali javob berilmagan (faqat saqlangan) yoki progress qayta boshlangan
  @Column({ type: 'varchar', length: 10, nullable: true })
  status: AnswerStatus | null;

  @Column({ name: 'selected_option', type: 'int', nullable: true })
  selectedOption: number | null;

  @Column({ name: 'is_saved', default: false })
  isSaved: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;
}

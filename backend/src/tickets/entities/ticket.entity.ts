import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Question } from '../../questions/entities/question.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // rasmiy bilet raqami (masalan 1-61)
  @Column({ unique: true })
  number: number;

  @ManyToMany(() => Question)
  @JoinTable({ name: 'ticket_questions' })
  questions: Question[];
}

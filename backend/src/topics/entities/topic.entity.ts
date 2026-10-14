import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Question } from '../../questions/entities/question.entity';

/** Mavzu matnlarining bitta tildagi ko'rinishi. */
export interface TopicTexts {
  name: string;
  description: string | null;
  category: string | null;
}

/** Asosiy maydonlar o'zbekcha (lotin); boshqa tillar shu yerda (admin kiritganda avtomatik to'ldiriladi). */
export type TopicTranslations = Partial<Record<'uzk' | 'ru', TopicTexts>>;

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  category: string | null;

  @Column({ type: 'jsonb', nullable: true })
  translations: TopicTranslations | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => Question, (question) => question.topic)
  questions: Question[];
}

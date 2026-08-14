import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Topic } from '../../topics/entities/topic.entity';
import type {
  LocalizedExplanation,
  LocalizedOptions,
  LocalizedText,
} from '../locale';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // manba (avto_test_data) dagi asl raqamli id, 1-700
  @Column({ name: 'source_id', type: 'int', unique: true, nullable: true })
  sourceId: number | null;

  @Column({ type: 'jsonb' })
  text: LocalizedText;

  @Column({ type: 'jsonb' })
  options: LocalizedOptions;

  @Column({ name: 'correct_option_index', type: 'int' })
  correctOptionIndex: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  explanation: LocalizedExplanation | null;

  // "chalg'ituvchi" / e'tibor talab qiladigan savollar
  @Column({ name: 'is_tricky', default: false })
  isTricky: boolean;

  // jarima, tezlik, masofa kabi raqamga oid savollar
  @Column({ name: 'is_number_related', default: false })
  isNumberRelated: boolean;

  @ManyToOne(() => Topic, (topic) => topic.questions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;
}

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

  // Javob belgilangandan keyin ko'rsatiladigan izoh-video (masalan, harakat tartibi animatsiyasi)
  @Column({ name: 'video_url', type: 'varchar', nullable: true })
  videoUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  explanation: LocalizedExplanation | null;

  // "chalg'ituvchi" / e'tibor talab qiladigan savollar
  @Column({ name: 'is_tricky', default: false })
  isTricky: boolean;

  // jarima, tezlik, masofa kabi raqamga oid savollar
  @Column({ name: 'is_number_related', default: false })
  isNumberRelated: boolean;

  // Nofaol savollar bazada qoladi, lekin hech qayerda (mavzular, biletlar, testlar, admin ro'yxati) ko'rsatilmaydi.
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Mavzu ichidagi tartib raqami (1 dan boshlab, bo'shliqsiz). Mavzusiz savollarda null.
  @Column({ name: 'topic_order', type: 'int', nullable: true })
  topicOrder: number | null;

  @ManyToOne(() => Topic, (topic) => topic.questions, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ContactMessageStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
}

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column()
  phone: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: ContactMessageStatus, default: ContactMessageStatus.NEW })
  status: ContactMessageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

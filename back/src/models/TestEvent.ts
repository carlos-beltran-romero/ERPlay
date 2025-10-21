import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { TestSession } from './TestSession';
import { TestResult } from './TestResult';

@Entity('test_events')
export class TestEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TestSession, s => s.events, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: TestSession;

  @ManyToOne(() => TestResult, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'result_id' })
  result!: TestResult | null;

  @Column({ type: 'varchar', length: 80 })
  type!: string; // p.ej. view_question, submit_answer...

  @Column({ type: 'json', nullable: true })
  payload!: any | null;

  @CreateDateColumn()
  createdAt!: Date;
}

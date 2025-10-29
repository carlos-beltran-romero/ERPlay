import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, BaseEntity
} from 'typeorm';
import { User } from './User';
import { Diagram } from './Diagram';
import { TestResult } from './TestResult';
import { TestEvent } from './TestEvent';

export type TestMode = 'learning' | 'exam' | 'errors';

@Entity('test_sessions')
export class TestSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Diagram, { nullable: false, onDelete: 'CASCADE' })
  diagram!: Diagram;

  @Column({ type: 'enum', enum: ['learning','exam','errors'], default: 'learning' })
  mode!: TestMode;

  @Column({ type: 'int', default: 0 })
  totalQuestions!: number;

  @Column({ type: 'int', default: 0 })
  correctCount!: number;

  @Column({ type: 'int', default: 0 })
  incorrectCount!: number;

  @Column({ type: 'int', nullable: true })
  durationSeconds!: number | null;

  @Column({ type: 'float', nullable: true })
  score!: number | null;

  @Column({ type: 'json', nullable: true })
  metadata!: any | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => TestResult, r => r.session, { cascade: true })
  results!: TestResult[];

  @OneToMany(() => TestEvent, e => e.session, { cascade: true })
  events!: TestEvent[];
}

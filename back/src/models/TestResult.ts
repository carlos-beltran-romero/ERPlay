import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, JoinColumn, BaseEntity
} from 'typeorm';
import { TestSession } from './TestSession';
import { Question } from './Question';
import { Claim } from './Claim';

@Entity('test_results')
export class TestResult {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TestSession, s => s.results, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: TestSession;

  @ManyToOne(() => Question, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'question_id' })
  question!: Question | null;

  @Column({ type: 'int' })
  orderIndex!: number; // posición en el test

  // Snapshots
  @Column({ type: 'text' })
  promptSnapshot!: string;

  @Column({ type: 'json' })
  optionsSnapshot!: string[];

  @Column({ type: 'int' })
  correctIndexAtTest!: number;

  // Interacciones
  @Column({ type: 'int', nullable: true })
  selectedIndex!: number | null;

  @Column({ type: 'boolean', default: false })
  usedHint!: boolean;

  @Column({ type: 'boolean', default: false })
  revealedAnswer!: boolean;

  @Column({ type: 'int', default: 0 })
  attemptsCount!: number;

  @Column({ type: 'int', default: 0 })
  timeSpentSeconds!: number;

  @Column({ type: 'boolean', nullable: true })
  isCorrect!: boolean | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Claim, (claim) => claim.testResult, { cascade: false })
  claims!: Claim[];
}

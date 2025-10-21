import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, JoinColumn
} from 'typeorm';
import { User } from './User';
import { Question } from './Question';
import { Diagram } from './Diagram';
import { TestResult } from './TestResult'; // <-- importa TestResult

export enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.PENDING })
  status!: ClaimStatus;

  /** Pregunta original (opcional) */
  @ManyToOne(() => Question, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'question_id' })
  question?: Question | null;

  /** Resultado concreto del test al que está asociada la reclamación (opcional) */
  @ManyToOne(() => TestResult, (tr) => tr.claims, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'test_result_id' })
  testResult?: TestResult | null;

  /** Diagrama asociado (para contexto en revisión) */
  @ManyToOne(() => Diagram, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'diagram_id' })
  diagram?: Diagram | null;

  /** Alumno que reclama */
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: User;

  /** Instantánea del enunciado/opciones en el momento de reclamar */
  @Column({ type: 'text' })
  promptSnapshot!: string;

  @Column({ type: 'json' })
  optionsSnapshot!: string[]; // array de opciones en ese momento

  /** Índices */
  @Column({ type: 'int' })
  chosenIndex!: number;

  @Column({ type: 'int' })
  correctIndexAtSubmission!: number;

  /** Motivo del alumno */
  @Column({ type: 'text' })
  explanation!: string;

  /** Revisión del profesor */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer?: User | null;

  @Column({ type: 'text', nullable: true })
  reviewerComment?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

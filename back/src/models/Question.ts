/**
 * Módulo del modelo de preguntas
 * @module back/models/Question
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  BaseEntity,
} from 'typeorm';
import { Diagram } from './Diagram';
import { User } from './User';
import { Option } from './Option';

/**
 * Estados de revisión para preguntas propuestas por estudiantes
 */
export enum ReviewStatus {
  /** Pendiente de revisión por supervisor */
  PENDING = 'pending',
  /** Aprobada e incorporada al banco de preguntas */
  APPROVED = 'approved',
  /** Rechazada por el supervisor */
  REJECTED = 'rejected',
}

/**
 * Entidad Question - Pregunta de opción múltiple asociada a un diagrama ER
 * Las preguntas pueden ser creadas por supervisores o propuestas por estudiantes.
 * Las propuestas estudiantiles requieren aprobación antes de ser usadas en tests.
 *
 * @remarks Tabla en BD: `questions`.
 */
@Entity({ name: 'questions' })
export class Question extends BaseEntity {
  /**
   * Identificador único (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Enunciado de la pregunta
   * @example "¿Qué tipo de relación existe entre Estudiante y Curso?"
   */
  @Column({ type: 'text' })
  prompt!: string;

  /**
   * Pista o ayuda opcional (se muestra bajo demanda en modo learning)
   * @example "Observa la cardinalidad en ambos extremos de la relación"
   */
  @Column({ type: 'text' })
  hint!: string;

  /**
   * Índice 0-based de la opción correcta dentro del array de opciones
   * 0: opción A, 1: opción B, 2: opción C, 3: opción D
   */
  @Column({ type: 'int' })
  correctOptionIndex!: number;

  /**
   * Diagrama ER al que pertenece esta pregunta
   * Se elimina en cascada con el diagrama
   */
  @ManyToOne(() => Diagram, (diagram) => diagram.questions, { nullable: false, onDelete: 'CASCADE' })
  diagram!: Diagram;

  /**
   * Usuario que creó la pregunta (supervisor o estudiante)
   * Se establece en NULL si el usuario es eliminado
   */
  @ManyToOne(() => User, (user) => user.questions, { nullable: true, onDelete: 'SET NULL' })
  creator!: User | null;

  /**
   * Opciones de respuesta (típicamente 4)
   * Se eliminan en cascada con la pregunta
   */
  @OneToMany(() => Option, (option) => option.question, { cascade: true })
  options!: Option[];

  /**
   * Estado de revisión de la pregunta
   * - PENDING: Propuesta por estudiante, pendiente de revisión
   * - APPROVED: Aprobada por supervisor, disponible para tests
   * - REJECTED: Rechazada por supervisor con comentario explicativo
   * @default ReviewStatus.PENDING
   */
  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  /**
   * Supervisor que revisó la pregunta
   * Se establece en NULL si el supervisor es eliminado
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  reviewedBy!: User | null;

  /**
   * Fecha de revisión de la pregunta
   * NULL si aún no ha sido revisada
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  /**
   * Comentario del supervisor sobre la decisión de revisión
   * Explica por qué fue rechazada o aprobada con sugerencias
   * @example "Muy bien planteada. Agregada al banco de preguntas."
   * @example "El enunciado es ambiguo. Reformula y vuelve a enviar."
   */
  @Column({ type: 'text', nullable: true })
  reviewComment!: string | null;

  /** Fecha de creación de la pregunta */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /** Fecha de última actualización */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
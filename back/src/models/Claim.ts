/**
 * Módulo del modelo de reclamaciones
 * Define la entidad Claim para gestionar reclamaciones de estudiantes sobre respuestas en tests
 * @module back/models/Claim
 */

import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, JoinColumn
} from 'typeorm';
import { User } from './User';
import { Question } from './Question';
import { Diagram } from './Diagram';
import { TestResult } from './TestResult';

/**
 * Estados posibles de una reclamación
 * Representa el ciclo de vida de una reclamación desde su creación hasta su resolución
 */
export enum ClaimStatus {
  /** Reclamación pendiente de revisión por parte de un supervisor */
  PENDING = 'PENDING',
  /** Reclamación aprobada - se considera que el estudiante tenía razón */
  APPROVED = 'APPROVED',
  /** Reclamación rechazada - se mantiene la corrección original */
  REJECTED = 'REJECTED',
}

/**
 * Entidad Claim - Reclamación de estudiante sobre una respuesta de test
 * Permite a los estudiantes disputar la corrección de una pregunta cuando consideren
 * que su respuesta era correcta o que la pregunta contenía errores.
 *
 * @remarks
 * Tabla en BD: `claims`.
 * Flujo típico:
 * 1. Estudiante crea reclamación con estado PENDING
 * 2. Supervisor revisa y cambia estado a APPROVED o REJECTED
 * 3. Si es APPROVED, puede actualizarse la pregunta original
 */
@Entity('claims')
export class Claim {
  /**
   * Identificador único de la reclamación
   * Generado automáticamente como UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Estado actual de la reclamación
   * Controla el flujo de revisión y resolución
   * @default ClaimStatus.PENDING
   */
  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.PENDING })
  status!: ClaimStatus;

  /**
   * Pregunta original asociada a la reclamación
   * Puede ser null si la pregunta fue eliminada después de crear la reclamación
   */
  @ManyToOne(() => Question, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'question_id' })
  question?: Question | null;

  /**
   * Resultado específico del test al que pertenece esta reclamación
   * Vincula la reclamación con el intento concreto del estudiante
   */
  @ManyToOne(() => TestResult, (tr) => tr.claims, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'test_result_id' })
  testResult?: TestResult | null;

  /**
   * Diagrama asociado a la pregunta reclamada
   * Proporciona contexto visual para la revisión
   */
  @ManyToOne(() => Diagram, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'diagram_id' })
  diagram?: Diagram | null;

  /**
   * Estudiante que realiza la reclamación
   * Referencia obligatoria, se elimina en cascada si se borra el usuario
   */
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: User;

  /**
   * Instantánea del enunciado de la pregunta en el momento de la reclamación
   * Preserva el texto exacto que vio el estudiante, independiente de cambios posteriores
   */
  @Column({ type: 'text' })
  promptSnapshot!: string;

  /**
   * Instantánea de las opciones de respuesta en el momento de la reclamación
   * Array JSON con todas las opciones tal como se mostraron al estudiante
   */
  @Column({ type: 'json' })
  optionsSnapshot!: string[];

  /**
   * Índice de la opción elegida por el estudiante (0-based)
   * Identifica qué respuesta seleccionó el estudiante en el test
   */
  @Column({ type: 'int' })
  chosenIndex!: number;

  /**
   * Índice de la respuesta considerada correcta en el momento del test (0-based)
   * Preserva cuál era la respuesta marcada como correcta cuando se realizó el intento
   */
  @Column({ type: 'int' })
  correctIndexAtSubmission!: number;

  /**
   * Explicación del estudiante justificando su reclamación
   * Texto libre donde el estudiante argumenta por qué considera incorrecta la corrección
   */
  @Column({ type: 'text' })
  explanation!: string;

  /**
   * Supervisor que revisó la reclamación
   * Null mientras está pendiente, se asigna al resolverse
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer?: User | null;

  /**
   * Comentario del supervisor sobre su decisión
   * Explica el razonamiento detrás de aprobar o rechazar la reclamación
   */
  @Column({ type: 'text', nullable: true })
  reviewerComment?: string | null;

  /**
   * Fecha y hora en que se revisó la reclamación
   * Se establece cuando un supervisor cambia el estado de PENDING a APPROVED/REJECTED
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date | null;

  /**
   * Fecha y hora de creación de la reclamación
   * Generada automáticamente al insertar el registro
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Fecha y hora de última actualización
   * Actualizada automáticamente en cada modificación del registro
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
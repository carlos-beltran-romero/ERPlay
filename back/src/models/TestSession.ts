/**
 * Módulo del modelo de sesiones de test
 * @module back/models/TestSession
 */

import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, BaseEntity
} from 'typeorm';
import { User } from './User';
import { Diagram } from './Diagram';
import { TestResult } from './TestResult';
import { TestEvent } from './TestEvent';

/**
 * Modos de test disponibles
 */
export type TestMode = 'learning' | 'exam' | 'errors';

/**
 * Entidad TestSession - Sesión de test de un usuario
 * Representa un intento completo de test sobre un diagrama específico
 *
 * @remarks Tabla en BD: `test_sessions`.
 */
@Entity('test_sessions')
export class TestSession extends BaseEntity {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Usuario realizando el test, eliminación en cascada */
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  /** Diagrama sobre el que se realiza el test, eliminación en cascada */
  @ManyToOne(() => Diagram, { nullable: false, onDelete: 'CASCADE' })
  diagram!: Diagram;

  /** 
   * Modo del test
   * - learning: modo aprendizaje con feedback inmediato
   * - exam: modo examen sin ayudas
   * - errors: repaso de errores previos
   */
  @Column({ type: 'enum', enum: ['learning','exam','errors'], default: 'learning' })
  mode!: TestMode;

  /** Número total de preguntas en el test */
  @Column({ type: 'int', default: 0 })
  totalQuestions!: number;

  /** Cantidad de respuestas correctas */
  @Column({ type: 'int', default: 0 })
  correctCount!: number;

  /** Cantidad de respuestas incorrectas */
  @Column({ type: 'int', default: 0 })
  incorrectCount!: number;

  /** Duración total del test en segundos */
  @Column({ type: 'int', nullable: true })
  durationSeconds!: number | null;

  /** Puntuación final del test (0-100) */
  @Column({ type: 'float', nullable: true })
  score!: number | null;

  /** Metadata adicional en formato JSON */
  @Column({ type: 'json', nullable: true })
  metadata!: any | null;

  /** Fecha de creación de la sesión */
  @CreateDateColumn()
  createdAt!: Date;

  /** Fecha de finalización del test */
  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  /** Fecha de última actualización */
  @UpdateDateColumn()
  updatedAt!: Date;

  /** Resultados individuales de cada pregunta */
  @OneToMany(() => TestResult, r => r.session, { cascade: true })
  results!: TestResult[];

  /** Eventos registrados durante la sesión */
  @OneToMany(() => TestEvent, e => e.session, { cascade: true })
  events!: TestEvent[];
}
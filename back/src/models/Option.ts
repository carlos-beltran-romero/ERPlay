/**
 * Módulo del modelo de opciones de respuesta
 * @module back/models/Option
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import { Question } from './Question';

/**
 * Entidad Option - Opción de respuesta para preguntas de opción múltiple
 * Una pregunta típicamente tiene 4 opciones, de las cuales solo una es correcta.
 *
 * @remarks Tabla en BD: `options`.
 */
@Entity({ name: 'options' })
export class Option extends BaseEntity {
  /**
   * Identificador único (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Texto de la opción de respuesta
   * @example "1:N (uno a muchos)"
   */
  @Column({ type: 'text' })
  text!: string;

  /**
   * Índice de orden dentro de la pregunta (0-based)
   * 0: opción A, 1: opción B, 2: opción C, 3: opción D
   */
  @Column({ type: 'int' })
  orderIndex!: number;

  /**
   * Pregunta a la que pertenece esta opción
   * Se elimina en cascada con la pregunta
   */
  @ManyToOne(() => Question, (question) => question.options, { nullable: false, onDelete: 'CASCADE' })
  question!: Question;

  /** Fecha de creación */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /** Fecha de última actualización */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
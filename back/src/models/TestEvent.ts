/**
 * Módulo del modelo de eventos de test
 * @module back/models/TestEvent
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { TestSession } from './TestSession';
import { TestResult } from './TestResult';

/**
 * Entidad TestEvent - Registro de eventos durante una sesión de test
 * Permite tracking de acciones del usuario para análisis y auditoría
 *
 * @remarks Tabla en BD: `test_events`.
 */
@Entity('test_events')
export class TestEvent {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Sesión de test asociada, eliminación en cascada */
  @ManyToOne(() => TestSession, s => s.events, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: TestSession;

  /** Resultado de test asociado, opcional */
  @ManyToOne(() => TestResult, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'result_id' })
  result!: TestResult | null;

  /** 
   * Tipo de evento registrado
   * @example "view_question", "submit_answer", "use_hint"
   */
  @Column({ type: 'varchar', length: 80 })
  type!: string;

  /** Datos adicionales del evento en formato JSON */
  @Column({ type: 'json', nullable: true })
  payload!: any | null;

  /** Fecha de creación del evento */
  @CreateDateColumn()
  createdAt!: Date;
}
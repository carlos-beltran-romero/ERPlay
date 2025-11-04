/**
 * Módulo del modelo de resultados de test
 * @module models/TestResult
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BaseEntity,
} from "typeorm";
import { TestSession } from "./TestSession";
import { Question } from "./Question";
import { Claim } from "./Claim";

/**
 * Entidad TestResult - Resultado individual de una pregunta en un test
 * Almacena snapshot de la pregunta y todas las interacciones del usuario
 *
 * @entity test_results
 */
@Entity("test_results")
export class TestResult {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Sesión de test asociada, eliminación en cascada */
  @ManyToOne(() => TestSession, (s) => s.results, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "session_id" })
  session!: TestSession;

  /** Pregunta original asociada, puede ser null si se eliminó */
  @ManyToOne(() => Question, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "question_id" })
  question!: Question | null;

  /** Posición de esta pregunta en el test */
  @Column({ type: "int" })
  orderIndex!: number;

  /** Snapshot del enunciado en el momento del test */
  @Column({ type: "text" })
  promptSnapshot!: string;

  /** Snapshot de las opciones en el momento del test */
  @Column({ type: "json" })
  optionsSnapshot!: string[];

  /** Índice de la respuesta correcta en el momento del test */
  @Column({ type: "int" })
  correctIndexAtTest!: number;

  /** Índice de la opción seleccionada por el usuario (0-based), null si no respondió */
  @Column({ type: "int", nullable: true })
  selectedIndex!: number | null;

  /** Indica si el usuario usó la pista */
  @Column({ type: "boolean", default: false })
  usedHint!: boolean;

  /** Indica si el usuario reveló la respuesta correcta */
  @Column({ type: "boolean", default: false })
  revealedAnswer!: boolean;

  /** Número de intentos realizados */
  @Column({ type: "int", default: 0 })
  attemptsCount!: number;

  /** Tiempo invertido en esta pregunta (segundos) */
  @Column({ type: "int", default: 0 })
  timeSpentSeconds!: number;

  /** Indica si la respuesta fue correcta, null si no respondió */
  @Column({ type: "boolean", nullable: true })
  isCorrect!: boolean | null;

  /** Fecha de creación */
  @CreateDateColumn()
  createdAt!: Date;

  /** Fecha de última actualización */
  @UpdateDateColumn()
  updatedAt!: Date;

  /** Reclamaciones asociadas a este resultado */
  @OneToMany(() => Claim, (claim) => claim.testResult, { cascade: false })
  claims!: Claim[];
}

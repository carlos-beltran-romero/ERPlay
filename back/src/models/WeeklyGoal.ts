/**
 * Módulo del modelo de objetivos semanales
 * @module models/WeeklyGoal
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";

/**
 * Entidad WeeklyGoal - Objetivo semanal de tests completados
 * Define la meta de tests que los usuarios deben completar en una semana
 *
 * @entity WeeklyGoal
 */
@Entity("WeeklyGoal")
export class WeeklyGoal {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Fecha de inicio de la semana (formato YYYY-MM-DD) */
  @Column({ type: "date" })
  weekStart!: string;

  /** Fecha de fin de la semana (formato YYYY-MM-DD) */
  @Column({ type: "date" })
  weekEnd!: string;

  /** Número objetivo de tests a completar en la semana */
  @Column({ type: "int" })
  targetTests!: number;

  /** Usuario que creó el objetivo (supervisor) */
  @ManyToOne(() => User, { nullable: true })
  createdBy?: User | null;

  /** Fecha de creación */
  @CreateDateColumn()
  createdAt!: Date;
}

/**
 * Módulo del modelo de insignias de usuario
 * @module models/UserBadge
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from "typeorm";
import { User } from "./User";

/**
 * Entidad UserBadge - Insignia otorgada a un usuario
 * Representa logros y reconocimientos obtenidos por el usuario
 *
 * @entity user_badges
 */
@Entity({ name: "user_badges" })
export class UserBadge extends BaseEntity {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** Usuario propietario de la insignia, eliminación en cascada */
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  /**
   * Texto descriptivo de la insignia
   * @example "Primera semana completa"
   * @example "10 tests sin errores"
   */
  @Column({ type: "varchar", length: 120 })
  label!: string;

  /** Fecha y hora en que se obtuvo la insignia */
  @Column({ type: "timestamp", nullable: true })
  earnedAt!: Date | null;

  /** Fecha de creación */
  @CreateDateColumn()
  createdAt!: Date;

  /** Fecha de última actualización */
  @UpdateDateColumn()
  updatedAt!: Date;
}

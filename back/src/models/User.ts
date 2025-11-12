/**
 * Módulo del modelo de usuarios
 * @module back/models/User
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BaseEntity,
} from 'typeorm';
import { Question } from './Question';
import { Claim } from './Claim';
import { RefreshToken } from './RefreshToken';

/**
 * Roles de usuario en el sistema
 */
export enum UserRole {
  /** Estudiante con permisos básicos */
  STUDENT = 'alumno',
  /** Supervisor con permisos administrativos */
  SUPERVISOR = 'supervisor',
}

/**
 * Entidad User - Usuario del sistema (estudiante o supervisor)
 * Representa tanto a estudiantes como a supervisores con diferentes niveles de acceso
 *
 * @remarks Tabla en BD: `users`.
 */
@Entity({ name: 'users' })
export class User extends BaseEntity {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Nombre del usuario */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Apellido del usuario */
  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  /** Email único del usuario */
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  /** Hash de la contraseña (bcrypt) */
  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  /** Rol del usuario en el sistema */
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  /** Preguntas creadas por el usuario */
  @OneToMany(() => Question, (question) => question.creator)
  questions!: Question[];

  /** Reclamaciones realizadas por el usuario */
  @OneToMany(() => Claim, (claim) => claim.student)
  claims!: Claim[];

  /** Tokens de refresco del usuario */
  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  /** Fecha de creación */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /** Fecha de última actualización */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
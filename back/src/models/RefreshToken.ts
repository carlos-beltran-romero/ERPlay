/**
 * Módulo del modelo de tokens de refresco
 * @module models/RefreshToken
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User';

/**
 * Entidad RefreshToken - Token de refresco para renovar sesiones
 * Permite a los usuarios obtener nuevos access tokens sin re-autenticarse
 *
 * @remarks Tabla en BD: `refresh_tokens`.
 */
@Entity({ name: 'refresh_tokens' })
export class RefreshToken extends BaseEntity {
  /** Identificador único (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Token string almacenado de forma segura, único en el sistema */
  @Column({ type: 'varchar', length: 500, unique: true })
  token!: string;

  /** Fecha de expiración del token */
  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  /** Indica si el token ha sido revocado manualmente */
  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  /** Usuario propietario del token, eliminación en cascada */
  @ManyToOne(() => User, (user) => user.refreshTokens, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  /** Fecha de creación */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
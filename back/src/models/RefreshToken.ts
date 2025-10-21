// ================================
// src/models/RefreshToken.ts
// Entity representing a refresh token issued to a user
// ================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    BaseEntity,
  } from 'typeorm';
  import { User } from './User';
  
  @Entity({ name: 'refresh_tokens' })
  export class RefreshToken extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    /**
     * The actual token string stored securely
     */
    @Column({ type: 'varchar', length: 500, unique: true })
    token!: string;
  
    /**
     * Expiration date of the refresh token
     */
    @Column({ type: 'timestamp' })
    expiresAt!: Date;
  
    /**
     * Indicates if the token has been revoked
     */
    @Column({ type: 'boolean', default: false })
    revoked!: boolean;
  
    /**
     * User to whom this refresh token belongs
     */
    @ManyToOne(() => User, (user) => user.refreshTokens, { nullable: false, onDelete: 'CASCADE' })
    user!: User;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
  }
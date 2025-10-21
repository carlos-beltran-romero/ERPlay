// ================================
// src/models/User.ts
// User entity representing both students and supervisors
// ================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    BaseEntity,
  } from 'typeorm';
  import { Diagram } from './Diagram';
  import { Question } from './Question';
  import { Claim } from './Claim';
  import { Rating } from './Rating';
  import { RefreshToken } from './RefreshToken';
  
  export enum UserRole {
    STUDENT = 'alumno',
    SUPERVISOR = 'supervisor',
  }
  
  @Entity({ name: 'users' })
  export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({type: 'varchar', length: 100 })
    lastName!: string;
  
    @Column({ type: 'varchar', length: 255, unique: true })
    email!: string;
  
    @Column({ type: 'varchar', length: 255 })
    passwordHash!: string;
  
    @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
    role!: UserRole;
  
    
    /**
     * Questions created by the user
     */
    @OneToMany(() => Question, (question) => question.creator)
    questions!: Question[];
  
 
  
    /**
     * Claims submitted by the user
     */
    @OneToMany(() => Claim, (claim) => claim.student)
    claims!: Claim[];
  
    /**
     * Ratings submitted by the user
     */
    @OneToMany(() => Rating, (rating) => rating.user)
    ratings!: Rating[];
  
    /**
     * Refresh tokens issued to the user
     */
    @OneToMany(() => RefreshToken, (token) => token.user)
    refreshTokens!: RefreshToken[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

  
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
  }
  
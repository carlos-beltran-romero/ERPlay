import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Claim } from './Claim';
import { Diagram } from './Diagram';
import { Question } from './Question';
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

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @OneToMany(() => Question, (question) => question.creator)
  questions!: Question[];

  @OneToMany(() => Diagram, (diagram) => diagram.creator)
  diagrams!: Diagram[];

  @OneToMany(() => Claim, (claim) => claim.student)
  claims!: Claim[];

  @OneToMany(() => Rating, (rating) => rating.user)
  ratings!: Rating[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

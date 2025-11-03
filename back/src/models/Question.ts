import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Diagram } from './Diagram';
import { Option } from './Option';
import { Rating } from './Rating';
import { User } from './User';

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum QuestionSource {
  CATALOG = 'catalog',
  STUDENT = 'student',
}

@Entity({ name: 'questions' })
export class Question extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'text' })
  hint!: string;

  @Column({ type: 'int' })
  correctOptionIndex!: number;

  @Column({ type: 'enum', enum: QuestionSource, default: QuestionSource.CATALOG })
  source!: QuestionSource;

  @ManyToOne(() => Diagram, (diagram) => diagram.questions, { nullable: false, onDelete: 'CASCADE' })
  diagram!: Diagram;

  @ManyToOne(() => User, (user) => user.questions, { nullable: true, onDelete: 'SET NULL' })
  creator!: User | null;

  @OneToMany(() => Option, (option) => option.question, { cascade: ['insert', 'update'], eager: false })
  options!: Option[];

  @OneToMany(() => Rating, (rating) => rating.question)
  ratings!: Rating[];

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  reviewedBy!: User | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  reviewComment!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

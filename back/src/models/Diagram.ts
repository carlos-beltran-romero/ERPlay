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
import { Question } from './Question';
import { User } from './User';

@Entity({ name: 'diagrams' })
export class Diagram extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  title!: string;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 500 })
  path!: string;

  @ManyToOne(() => User, (user) => user.diagrams, { nullable: false, onDelete: 'CASCADE' })
  creator!: User;

  @OneToMany(() => Question, (question) => question.diagram, { cascade: ['insert', 'update'] })
  questions!: Question[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

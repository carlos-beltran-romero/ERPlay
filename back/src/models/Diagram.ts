import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, BaseEntity,
} from 'typeorm';
import { User } from './User';
import { Question } from './Question';

@Entity({ name: 'diagrams' })
export class Diagram extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ✔️ Título que pide el front
  @Column({ type: 'varchar', length: 255, unique: true })
  title!: string;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 500 })
  path!: string;

  @OneToMany(() => Question, (question) => question.diagram, { cascade: true })
  questions!: Question[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

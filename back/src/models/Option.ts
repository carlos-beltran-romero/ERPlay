// ================================
// src/models/Option.ts
// Entity representing an answer option for a multiple-choice question
// ================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    BaseEntity,
  } from 'typeorm';
  import { Question } from './Question';
  
  @Entity({ name: 'options' })
  export class Option extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    /**
     * Text content of the option
     */
    @Column({ type: 'text' })
    text!: string;
  
    /**
     * Order index of this option within its question (0-based)
     */
    @Column({ type: 'int' })
    orderIndex!: number;
  
    /**
     * Question to which this option belongs
     */
    @ManyToOne(() => Question, (question) => question.options, { nullable: false, onDelete: 'CASCADE' })
    question!: Question;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
  }
  
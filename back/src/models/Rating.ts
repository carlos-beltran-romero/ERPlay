// ================================
// src/models/Rating.ts
// Entity representing a star rating submitted by a user for a question
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
  import { User } from './User';
  import { Question } from './Question';
  
  @Entity({ name: 'ratings' })
  export class Rating extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    /**
     * Numerical rating value (1-5)
     */
    @Column({ type: 'int' })
    rating!: number;
  
    /**
     * User who submitted the rating
     */
    @ManyToOne(() => User, (user) => user.ratings, { nullable: false, onDelete: 'CASCADE' })
    user!: User;
  
    /**
     * Question that was rated
     */
    @ManyToOne(() => Question, (question) => question.ratings, { nullable: false, onDelete: 'CASCADE' })
    question!: Question;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
  }
  
// src/models/Question.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  BaseEntity,
} from "typeorm";
import { Diagram } from "./Diagram";
import { User } from "./User";
import { Option } from "./Option";
import { Rating } from "./Rating";

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity({ name: "questions" })
export class Question extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  prompt!: string;

  @Column({ type: "text" })
  hint!: string;

  @Column({ type: "int" })
  correctOptionIndex!: number;

  @ManyToOne(() => Diagram, (diagram) => diagram.questions, {
    nullable: false,
    onDelete: "CASCADE",
  })
  diagram!: Diagram;

  @ManyToOne(() => User, (user) => user.questions, {
    nullable: true,
    onDelete: "SET NULL",
  })
  creator!: User | null;

  @OneToMany(() => Option, (option) => option.question, { cascade: true })
  options!: Option[];

  @OneToMany(() => Rating, (rating) => rating.question)
  ratings!: Rating[];

  // 🔥 Campos de revisión
  @Column({ type: "enum", enum: ReviewStatus, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  reviewedBy!: User | null;

  @Column({ type: "timestamp", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  reviewComment!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

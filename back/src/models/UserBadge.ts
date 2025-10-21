import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { User } from './User';

@Entity({ name: 'user_badges' })
export class UserBadge extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Texto corto de la insignia (p.ej., "Primera semana completa") */
  @Column({ type: 'varchar', length: 120 })
  label!: string;

  /** Momento de obtención (nullable por si haces batch/retroactivas) */
  @Column({ type: 'timestamp', nullable: true })
  earnedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

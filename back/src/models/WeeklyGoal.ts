import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity('WeeklyGoal')
export class WeeklyGoal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Inicio/fin de la semana (00:00:00 y 23:59:59)
  @Column({ type: 'date' })
  weekStart!: string; // YYYY-MM-DD

  @Column({ type: 'date' })
  weekEnd!: string;   // YYYY-MM-DD

  @Column({ type: 'int' })
  targetTests!: number;

  @ManyToOne(() => User, { nullable: true })
  createdBy?: User | null;

  @CreateDateColumn()
  createdAt!: Date;
}

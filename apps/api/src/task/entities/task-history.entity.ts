import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Task } from './task.entity';

@Entity('task_history')
export class TaskHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  taskId: number;

  @ManyToOne(() => Task, (task) => task.history, { onDelete: 'CASCADE' })
  task: Task;

  @Column({
    type: 'simple-enum',
    enum: ['created', 'updated', 'deleted', 'restored', 'toggled'],
  })
  action: string;

  @Column({ type: 'text', nullable: true })
  changes: string;

  @CreateDateColumn()
  createdAt: Date;
}

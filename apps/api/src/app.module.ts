import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task/entities/task.entity';
import { TaskHistory } from './task/entities/task-history.entity';
import { IdempotencyKey } from './task/entities/idempotency-key.entity';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_FILE || 'todolist.db',
      entities: [Task, TaskHistory, IdempotencyKey],
      synchronize: true,
    }),
    TaskModule,
  ],
})
export class AppModule {}

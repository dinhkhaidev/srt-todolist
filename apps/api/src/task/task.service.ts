import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskHistory } from './entities/task-history.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { CreateTaskDto, UpdateTaskDto, BulkUpdateTaskDto, QueryTaskDto, TaskStatusFilter, TaskSortBy, TaskOrder } from '@todolist/shared';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskHistory)
    private readonly historyRepository: Repository<TaskHistory>,
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepository: Repository<IdempotencyKey>,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create(createTaskDto);
    const saved = await this.taskRepository.save(task);

    await this.logHistory(saved.id, 'created', {
      title: saved.title,
      description: saved.description,
    });

    return saved;
  }

  async findAll(query: QueryTaskDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(query.limit || '10', 10) || 10),
    );
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || TaskSortBy.CREATED_AT;
    const order = query.order || TaskOrder.DESC;

    const qb = this.taskRepository.createQueryBuilder('task');

    if (query.status === TaskStatusFilter.COMPLETED) {
      qb.andWhere('task.completed = :completed', { completed: true });
    } else if (query.status === TaskStatusFilter.PENDING) {
      qb.andWhere('task.completed = :completed', { completed: false });
    }

    if (query.search) {
      qb.andWhere(
        '(task.title LIKE :search OR task.description LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.includeDeleted === 'true') {
      qb.withDeleted();
    }

    const sortField =
      sortBy === TaskSortBy.CREATED_AT
        ? 'task.createdAt'
        : sortBy === TaskSortBy.UPDATED_AT
          ? 'task.updatedAt'
          : 'task.title';

    qb.orderBy(sortField, order === TaskOrder.ASC ? 'ASC' : 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, includeDeleted = false): Promise<Task> {
    const options = includeDeleted ? { withDeleted: true } : {};
    const task = await this.taskRepository.findOne({
      where: { id },
      ...options,
    });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    if (
      updateTaskDto.version !== undefined &&
      updateTaskDto.version !== task.version
    ) {
      throw new ConflictException(
        `Task #${id} has been modified by another request. Current version: ${task.version}, provided version: ${updateTaskDto.version}`,
      );
    }

    const changes: Record<string, { old: any; new: any }> = {};

    if (
      updateTaskDto.title !== undefined &&
      updateTaskDto.title !== task.title
    ) {
      changes.title = { old: task.title, new: updateTaskDto.title };
      task.title = updateTaskDto.title;
    }

    if (
      updateTaskDto.description !== undefined &&
      updateTaskDto.description !== task.description
    ) {
      changes.description = {
        old: task.description,
        new: updateTaskDto.description,
      };
      task.description = updateTaskDto.description;
    }

    if (
      updateTaskDto.completed !== undefined &&
      updateTaskDto.completed !== task.completed
    ) {
      changes.completed = { old: task.completed, new: updateTaskDto.completed };
      task.completed = updateTaskDto.completed;
    }

    if (Object.keys(changes).length === 0) {
      return task;
    }

    const saved = await this.taskRepository.save(task);
    await this.logHistory(id, 'updated', changes);

    return saved;
  }

  async remove(id: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    if (task.deletedAt) {
      // Nếu đã xóa mềm, thực hiện xóa vĩnh viễn khỏi Database
      await this.taskRepository.remove(task);
    } else {
      // Nếu là task đang hoạt động, thực hiện xóa mềm (đưa vào thùng rác)
      await this.taskRepository.softRemove(task);
      await this.logHistory(id, 'deleted', { title: task.title });
    }
  }

  async toggle(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    task.completed = !task.completed;
    const saved = await this.taskRepository.save(task);

    await this.logHistory(id, 'toggled', {
      completed: { old: !task.completed, new: task.completed },
    });

    return saved;
  }

  async restore(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    if (!task.deletedAt) {
      throw new BadRequestException(`Task #${id} is not deleted`);
    }

    await this.taskRepository.recover(task);
    await this.logHistory(id, 'restored', { title: task.title });

    return task;
  }

  async bulkUpdate(
    dto: BulkUpdateTaskDto,
    idempotencyKey?: string,
  ): Promise<{
    results: Array<{ id: number; status: string; data?: Task; error?: string }>;
  }> {
    if (idempotencyKey) {
      const existing = await this.idempotencyRepository.findOne({
        where: { key: idempotencyKey },
      });

      if (existing) {
        return JSON.parse(existing.response) as {
          results: Array<{
            id: number;
            status: string;
            data?: Task;
            error?: string;
          }>;
        };
      }
    }

    const results: Array<{
      id: number;
      status: string;
      data?: Task;
      error?: string;
    }> = [];

    for (const item of dto.tasks) {
      try {
        const updated = await this.update(item.id, item.data || {});
        results.push({ id: item.id, status: 'success', data: updated });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          id: item.id,
          status: 'error',
          error: message,
        });
      }
    }

    if (idempotencyKey) {
      const idempotency = this.idempotencyRepository.create({
        key: idempotencyKey,
        response: JSON.stringify({ results }),
        statusCode: 200,
      });
      await this.idempotencyRepository.save(idempotency);
    }

    return { results };
  }

  async getHistory(id: number): Promise<TaskHistory[]> {
    const task = await this.taskRepository.findOne({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }

    return this.historyRepository.find({
      where: { taskId: id },
      order: { createdAt: 'DESC' },
    });
  }

  private async logHistory(
    taskId: number,
    action: string,
    changes: Record<string, any>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      taskId,
      action,
      changes: JSON.stringify(changes),
    });
    await this.historyRepository.save(history);
  }
}

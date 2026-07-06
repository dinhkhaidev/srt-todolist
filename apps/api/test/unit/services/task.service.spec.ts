/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TaskService } from '../../../src/task/task.service';
import { Task } from '../../../src/task/entities/task.entity';
import { TaskHistory } from '../../../src/task/entities/task-history.entity';
import { IdempotencyKey } from '../../../src/task/entities/idempotency-key.entity';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepo: Record<string, jest.Mock>;
  let historyRepo: Record<string, jest.Mock>;
  let idempotencyRepo: Record<string, jest.Mock>;

  const mockTask: Partial<Task> = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    completed: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
  };

  beforeEach(async () => {
    taskRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...mockTask, ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      softRemove: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      recover: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        withDeleted: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
      })),
    };

    historyRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockResolvedValue([]),
    };

    idempotencyRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(TaskHistory), useValue: historyRepo },
        {
          provide: getRepositoryToken(IdempotencyKey),
          useValue: idempotencyRepo,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  describe('create', () => {
    it('should create a task and log history', async () => {
      const dto = { title: 'New Task', description: 'Desc' };
      const result = await service.create(dto);

      expect(taskRepo.create).toHaveBeenCalledWith(dto);
      expect(taskRepo.save).toHaveBeenCalled();
      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'created' }),
      );
      expect(historyRepo.save).toHaveBeenCalled();
      expect(result.title).toBe('New Task');
    });
  });

  describe('findAll', () => {
    it('should return paginated results with metadata', async () => {
      const result = await service.findAll({ page: '1', limit: '10' });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle status filter', async () => {
      await service.findAll({ status: 'completed' as any });
      expect(taskRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle search query', async () => {
      await service.findAll({ search: 'test' });
      expect(taskRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      taskRepo.findOne.mockResolvedValue(mockTask);
      const result = await service.findOne(1);
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a task and log changes', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      const dto = { title: 'Updated Title' };
      const result = await service.update(1, dto);

      expect(result.title).toBe('Updated Title');
      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'updated' }),
      );
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.update(999, { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask, version: 2 });
      await expect(
        service.update(1, { title: 'X', version: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not log history if no changes', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      await service.update(1, { title: 'Test Task' });
      expect(historyRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete a task and log history', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      await service.remove(1);

      expect(taskRepo.softRemove).toHaveBeenCalled();
      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'deleted' }),
      );
    });

    it('should hard delete a task if it is already soft deleted', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask, deletedAt: new Date() });
      await service.remove(1);

      expect(taskRepo.remove).toHaveBeenCalled();
      expect(taskRepo.softRemove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggle', () => {
    it('should toggle task completion status', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask, completed: false });
      const result = await service.toggle(1);

      expect(result.completed).toBe(true);
      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'toggled' }),
      );
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.toggle(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted task', async () => {
      taskRepo.findOne.mockResolvedValue({
        ...mockTask,
        deletedAt: new Date(),
      });
      await service.restore(1);

      expect(taskRepo.recover).toHaveBeenCalled();
      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'restored' }),
      );
    });

    it('should throw BadRequestException if task is not deleted', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask, deletedAt: null });
      await expect(service.restore(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.restore(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple tasks', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      const dto = {
        tasks: [
          { id: 1, data: { title: 'Updated 1' } },
          { id: 2, data: { title: 'Updated 2' } },
        ],
      };

      const result = await service.bulkUpdate(dto);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('success');
    });

    it('should handle errors per task without stopping', async () => {
      taskRepo.findOne
        .mockResolvedValueOnce({ ...mockTask })
        .mockResolvedValueOnce(null);

      const dto = {
        tasks: [
          { id: 1, data: { title: 'Updated' } },
          { id: 999, data: { title: 'Not found' } },
        ],
      };

      const result = await service.bulkUpdate(dto);
      expect(result.results[0].status).toBe('success');
      expect(result.results[1].status).toBe('error');
    });

    it('should return cached response for duplicate idempotency key', async () => {
      const cachedResponse = { results: [{ id: 1, status: 'success' }] };
      idempotencyRepo.findOne.mockResolvedValue({
        response: JSON.stringify(cachedResponse),
      });

      const result = await service.bulkUpdate(
        { tasks: [{ id: 1, data: { title: 'X' } }] },
        'test-key',
      );
      expect(result).toEqual(cachedResponse);
    });
  });

  describe('getHistory', () => {
    it('should return task history', async () => {
      taskRepo.findOne.mockResolvedValue({ ...mockTask });
      const histories = [{ id: 1, action: 'created', changes: '{}' }];
      historyRepo.find.mockResolvedValue(histories);

      const result = await service.getHistory(1);
      expect(result).toEqual(histories);
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepo.findOne.mockResolvedValue(null);
      await expect(service.getHistory(999)).rejects.toThrow(NotFoundException);
    });
  });
});

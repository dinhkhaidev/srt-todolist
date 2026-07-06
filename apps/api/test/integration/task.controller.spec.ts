import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from '../../src/task/task.controller';
import { TaskService } from '../../src/task/task.service';

describe('TaskController', () => {
  let controller: TaskController;

  const mockTask = {
    id: 1,
    title: 'Test',
    description: 'Desc',
    completed: false,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockCreate = jest.fn().mockResolvedValue(mockTask);
  const mockFindAll = jest.fn().mockResolvedValue({
    data: [mockTask],
    meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
  });
  const mockFindOne = jest.fn().mockResolvedValue(mockTask);
  const mockUpdate = jest
    .fn()
    .mockResolvedValue({ ...mockTask, title: 'Updated' });
  const mockRemove = jest.fn().mockResolvedValue(undefined);
  const mockToggle = jest
    .fn()
    .mockResolvedValue({ ...mockTask, completed: true });
  const mockRestore = jest.fn().mockResolvedValue(mockTask);
  const mockBulkUpdate = jest.fn().mockResolvedValue({ results: [] });
  const mockGetHistory = jest.fn().mockResolvedValue([]);

  const mockTaskService = {
    create: mockCreate,
    findAll: mockFindAll,
    findOne: mockFindOne,
    update: mockUpdate,
    remove: mockRemove,
    toggle: mockToggle,
    restore: mockRestore,
    bulkUpdate: mockBulkUpdate,
    getHistory: mockGetHistory,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [{ provide: TaskService, useValue: mockTaskService }],
    }).compile();

    controller = module.get<TaskController>(TaskController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a task', async () => {
    const dto = { title: 'Test', description: 'Desc' };
    const result = await controller.create(dto);
    expect(result).toEqual(mockTask);
    expect(mockCreate).toHaveBeenCalledWith(dto);
  });

  it('should return paginated tasks', async () => {
    const result = await controller.findAll({ page: '1', limit: '10' });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('should return a single task', async () => {
    const result = await controller.findOne(1);
    expect(result).toEqual(mockTask);
    expect(mockFindOne).toHaveBeenCalledWith(1, false);
  });

  it('should update a task', async () => {
    const result = await controller.update(1, { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('should toggle a task', async () => {
    const result = await controller.toggle(1);
    expect(result.completed).toBe(true);
  });

  it('should remove a task', async () => {
    await controller.remove(1);
    expect(mockRemove).toHaveBeenCalledWith(1);
  });

  it('should restore a task', async () => {
    const result = await controller.restore(1);
    expect(result).toEqual(mockTask);
  });

  it('should bulk update tasks', async () => {
    const dto = { tasks: [{ id: 1, data: { title: 'X' } }] };
    await controller.bulkUpdate(dto, 'key-1');
    expect(mockBulkUpdate).toHaveBeenCalledWith(dto, 'key-1');
  });

  it('should return task history', async () => {
    const result = await controller.getHistory(1);
    expect(result).toEqual([]);
  });
});

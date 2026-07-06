import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto, BulkUpdateTaskDto, QueryTaskDto } from '@todolist/shared';
import { Task } from './entities/task.entity';

@ApiTags('Tasks')
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: Task,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.taskService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tasks with search, filter, pagination, and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tasks with pagination metadata',
  })
  async findAll(@Query() query: QueryTaskDto) {
    return this.taskService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiResponse({ status: 200, description: 'Task found', type: Task })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted tasks',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeDeleted') includeDeleted?: string,
  ): Promise<Task> {
    return this.taskService.findOne(id, includeDeleted === 'true');
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a task (supports optimistic locking via version field)',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({
    status: 409,
    description: 'Version conflict (optimistic locking)',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    return this.taskService.update(id, updateTaskDto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle task completion status' })
  @ApiResponse({
    status: 200,
    description: 'Task toggled successfully',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async toggle(@Param('id', ParseIntPipe) id: number): Promise<Task> {
    return this.taskService.toggle(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a task (can be restored)' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.taskService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted task' })
  @ApiResponse({
    status: 200,
    description: 'Task restored successfully',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Task is not deleted' })
  async restore(@Param('id', ParseIntPipe) id: number): Promise<Task> {
    return this.taskService.restore(id);
  }

  @Patch('bulk/update')
  @ApiOperation({
    summary:
      'Bulk update multiple tasks (supports idempotency via Idempotency-Key header)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique key to prevent duplicate processing',
  })
  @ApiResponse({ status: 200, description: 'Bulk update results' })
  async bulkUpdate(
    @Body() dto: BulkUpdateTaskDto,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ) {
    return this.taskService.bulkUpdate(dto, idempotencyKey);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get task change history (audit trail)' })
  @ApiResponse({ status: 200, description: 'Task history' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.getHistory(id);
  }
}

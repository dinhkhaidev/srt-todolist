import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { TaskStatusFilter, TaskSortBy, TaskOrder } from '../constants/task.constants';

export class QueryTaskDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TaskStatusFilter)
  status?: TaskStatusFilter;

  @IsOptional()
  @IsString()
  includeDeleted?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsEnum(TaskSortBy)
  sortBy?: TaskSortBy;

  @IsOptional()
  @IsEnum(TaskOrder)
  order?: TaskOrder;
}

import { TaskStatusFilter, TaskSortBy, TaskOrder } from '../constants/task.constants';

export interface ITask {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ITaskHistory {
  id: number;
  taskId: number;
  action: string;
  changes?: string;
  createdAt: Date;
}

export interface ICreateTask {
  title: string;
  description?: string;
}

export interface IUpdateTask {
  title?: string;
  description?: string;
  completed?: boolean;
  version?: number;
}

export interface IQueryTask {
  search?: string;
  status?: TaskStatusFilter;
  includeDeleted?: string;
  page?: string;
  limit?: string;
  sortBy?: TaskSortBy;
  order?: TaskOrder;
}

export interface IBulkTaskItem {
  id: number;
  data?: IUpdateTask;
}

export interface IBulkUpdateTask {
  tasks: IBulkTaskItem[];
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

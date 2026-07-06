import { useState, useEffect, useCallback } from 'react';
import type { ITask, IQueryTask, IPaginatedResponse } from '@todolist/shared';
import { TaskStatusFilter, TaskSortBy, TaskOrder } from '@todolist/shared';
import { taskApi } from '../services/taskApi';

export function useTasks() {
  const [tasks, setTasks] = useState<IPaginatedResponse<ITask> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<IQueryTask>({
    page: '1',
    limit: '10',
    status: TaskStatusFilter.ALL,
    sortBy: TaskSortBy.CREATED_AT,
    order: TaskOrder.DESC,
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getAll(query);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (title: string, description?: string) => {
    try {
      const res = await taskApi.create({ title, description });
      await fetchTasks();
      return res;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create task');
    }
  };

  const updateTask = async (id: number, data: Partial<ITask>) => {
    try {
      const res = await taskApi.update(id, data);
      await fetchTasks();
      return res;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update task');
    }
  };

  const toggleTask = async (id: number) => {
    try {
      const res = await taskApi.toggle(id);
      await fetchTasks();
      return res;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to toggle task');
    }
  };

  const deleteTask = async (id: number) => {
    try {
      await taskApi.delete(id);
      await fetchTasks();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete task');
    }
  };

  const restoreTask = async (id: number) => {
    try {
      const res = await taskApi.restore(id);
      await fetchTasks();
      return res;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to restore task');
    }
  };

  const bulkUpdateTasks = async (ids: number[], data: any) => {
    try {
      const idempotencyKey = `bulk-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const payload = {
        tasks: ids.map((id) => ({ id, data })),
      };
      const res = await taskApi.bulkUpdate(payload, idempotencyKey);
      await fetchTasks();
      return res;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to bulk update tasks');
    }
  };

  const bulkDeleteTasks = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => taskApi.delete(id)));
      await fetchTasks();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to bulk delete tasks');
    }
  };

  const bulkRestoreTasks = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => taskApi.restore(id)));
      await fetchTasks();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to bulk restore tasks');
    }
  };

  const updateQuery = (newQuery: Partial<IQueryTask>) => {
    setQuery((prev) => ({ ...prev, ...newQuery }));
  };

  return {
    tasks,
    loading,
    error,
    query,
    fetchTasks,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    restoreTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    bulkRestoreTasks,
    updateQuery,
  };
}

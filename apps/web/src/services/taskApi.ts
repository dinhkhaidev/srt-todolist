import axios from 'axios';
import type { ITask, ICreateTask, IUpdateTask, IQueryTask, IPaginatedResponse, ITaskHistory } from '@todolist/shared';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const taskApi = {
  getAll: async (query?: IQueryTask): Promise<IPaginatedResponse<ITask>> => {
    const response = await api.get('/task', { params: query });
    return response.data;
  },

  getById: async (id: number, includeDeleted = false): Promise<ITask> => {
    const response = await api.get(`/task/${id}`, {
      params: { includeDeleted: includeDeleted ? 'true' : undefined },
    });
    return response.data;
  },

  create: async (data: ICreateTask): Promise<ITask> => {
    const response = await api.post('/task', data);
    return response.data;
  },

  update: async (id: number, data: IUpdateTask): Promise<ITask> => {
    const response = await api.patch(`/task/${id}`, data);
    return response.data;
  },

  toggle: async (id: number): Promise<ITask> => {
    const response = await api.patch(`/task/${id}/toggle`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/task/${id}`);
  },

  restore: async (id: number): Promise<ITask> => {
    const response = await api.post(`/task/${id}/restore`);
    return response.data;
  },

  getHistory: async (id: number): Promise<ITaskHistory[]> => {
    const response = await api.get(`/task/${id}/history`);
    return response.data;
  },

  bulkUpdate: async (data: any, idempotencyKey?: string): Promise<any> => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    const response = await api.patch('/task/bulk/update', data, { headers });
    return response.data;
  },
};

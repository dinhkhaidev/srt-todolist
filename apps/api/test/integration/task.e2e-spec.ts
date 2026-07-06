/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../src/task/entities/task.entity';
import { TaskHistory } from '../../src/task/entities/task-history.entity';
import { IdempotencyKey } from '../../src/task/entities/idempotency-key.entity';
import { TaskModule } from '../../src/task/task.module';

describe('TaskController (e2e)', () => {
  let app: INestApplication;
  let createdTaskId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Task, TaskHistory, IdempotencyKey],
          synchronize: true,
          dropSchema: true,
        }),
        TaskModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/task (POST) - should create a task', async () => {
    const res = await request(app.getHttpServer())
      .post('/task')
      .send({ title: 'Test Task', description: 'Test Desc' })
      .expect(201);

    expect(res.body.title).toBe('Test Task');
    expect(res.body.description).toBe('Test Desc');
    expect(res.body.completed).toBe(false);
    createdTaskId = res.body.id;
  });

  it('/task (POST) - should reject invalid data', async () => {
    await request(app.getHttpServer())
      .post('/task')
      .send({ title: '' })
      .expect(400);
  });

  it('/task (POST) - should reject unknown fields', async () => {
    await request(app.getHttpServer())
      .post('/task')
      .send({ title: 'Test', unknownField: 'bad' })
      .expect(400);
  });

  it('/task (GET) - should return paginated tasks', async () => {
    const res = await request(app.getHttpServer())
      .get('/task')
      .query({ page: '1', limit: '10' })
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.meta.page).toBe(1);
  });

  it('/task (GET) - should search tasks', async () => {
    const res = await request(app.getHttpServer())
      .get('/task')
      .query({ search: 'Test' })
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('/task (GET) - should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/task')
      .query({ status: 'pending' })
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('/task/:id (GET) - should return a task', async () => {
    const res = await request(app.getHttpServer())
      .get(`/task/${createdTaskId}`)
      .expect(200);

    expect(res.body.id).toBe(createdTaskId);
  });

  it('/task/:id (GET) - should return 404 for non-existent task', async () => {
    await request(app.getHttpServer()).get('/task/9999').expect(404);
  });

  it('/task/:id (PATCH) - should update a task', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/task/${createdTaskId}`)
      .send({ title: 'Updated Task' })
      .expect(200);

    expect(res.body.title).toBe('Updated Task');
  });

  it('/task/:id (PATCH) - should detect version conflict', async () => {
    await request(app.getHttpServer())
      .patch(`/task/${createdTaskId}`)
      .send({ title: 'Conflict', version: 999 })
      .expect(409);
  });

  it('/task/:id/toggle (PATCH) - should toggle completion', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/task/${createdTaskId}/toggle`)
      .expect(200);

    expect(res.body.completed).toBe(true);

    const res2 = await request(app.getHttpServer())
      .patch(`/task/${createdTaskId}/toggle`)
      .expect(200);

    expect(res2.body.completed).toBe(false);
  });

  it('/task/:id/history (GET) - should return audit trail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/task/${createdTaskId}/history`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].action).toBeDefined();
  });

  it('/task/bulk/update (PATCH) - should bulk update tasks', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/task')
      .send({ title: 'Bulk Task 1' })
      .expect(201);
    const bulkTaskId = createRes.body.id;

    const res = await request(app.getHttpServer())
      .patch('/task/bulk/update')
      .send({
        tasks: [{ id: bulkTaskId, data: { title: 'Bulk Updated' } }],
      })
      .expect(200);

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].status).toBe('success');
  });

  it('/task/bulk/update (PATCH) - should handle idempotency key', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/task')
      .send({ title: 'Idempotent Task' })
      .expect(201);
    const idempotentTaskId = createRes.body.id;

    const firstRes = await request(app.getHttpServer())
      .patch('/task/bulk/update')
      .set('Idempotency-Key', 'unique-key-123')
      .send({
        tasks: [{ id: idempotentTaskId, data: { title: 'Idempotent Update' } }],
      })
      .expect(200);

    const secondRes = await request(app.getHttpServer())
      .patch('/task/bulk/update')
      .set('Idempotency-Key', 'unique-key-123')
      .send({
        tasks: [{ id: idempotentTaskId, data: { title: 'Should Not Apply' } }],
      })
      .expect(200);

    expect(secondRes.body).toEqual(firstRes.body);
  });

  it('/task/:id (DELETE) - should soft delete a task', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/task')
      .send({ title: 'To Delete' })
      .expect(201);
    const deleteTaskId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/task/${deleteTaskId}`)
      .expect(204);

    await request(app.getHttpServer()).get(`/task/${deleteTaskId}`).expect(404);
  });

  it('/task/:id/restore (POST) - should restore a deleted task', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/task')
      .send({ title: 'To Restore' })
      .expect(201);
    const restoreTaskId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/task/${restoreTaskId}`)
      .expect(204);

    const res = await request(app.getHttpServer())
      .post(`/task/${restoreTaskId}/restore`)
      .expect(200);

    expect(res.body.id).toBe(restoreTaskId);
  });

  it('/task/:id/restore (POST) - should reject restoring non-deleted task', async () => {
    await request(app.getHttpServer())
      .post(`/task/${createdTaskId}/restore`)
      .expect(400);
  });
});

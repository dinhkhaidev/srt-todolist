import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  response: string;

  @Column({ type: 'integer' })
  statusCode: number;

  @CreateDateColumn()
  createdAt: Date;
}

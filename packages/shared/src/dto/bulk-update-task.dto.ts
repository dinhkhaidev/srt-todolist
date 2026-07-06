import { IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTaskDto } from './update-task.dto';

export class BulkTaskItemDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTaskDto)
  data: UpdateTaskDto;
}

export class BulkUpdateTaskDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTaskItemDto)
  tasks: BulkTaskItemDto[];
}

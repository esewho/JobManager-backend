import { WorkShift } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSessionShift {
  @IsEnum(WorkShift)
  shift!: WorkShift;
}

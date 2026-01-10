import { WorkShift } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, Min } from 'class-validator';

export class TipPoolDto {
  @IsDateString()
  date: string;
  @IsInt()
  @Min(0)
  totalAmount: number;
  @IsEnum(WorkShift)
  shift!: WorkShift;
}

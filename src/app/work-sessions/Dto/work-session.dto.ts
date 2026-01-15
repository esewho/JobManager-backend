import { WorkSessionStatus } from '@prisma/client';
import { WorkShift } from '@prisma/client';

export class WorkSessionDto {
  id?: string;
  checkIn: Date | null;
  checkOut?: Date | null;
  totalMinutes: number;
  extraMinutes: number;
  status: WorkSessionStatus;
  shift: WorkShift | null;
}

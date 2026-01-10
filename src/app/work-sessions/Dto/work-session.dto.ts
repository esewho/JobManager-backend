import { WorkSessionStatus } from '@prisma/client';
import { WorkShift } from '@prisma/client';

export class WorkSessionDto {
  id: string;
  checkIn: Date;
  checkOut?: Date;
  totalMinutes: number;
  extraMinutes: number;
  status: WorkSessionStatus;
}

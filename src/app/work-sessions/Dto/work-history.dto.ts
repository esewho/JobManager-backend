import { WorkShift } from '@prisma/client';

export class WorkHistoryDto {
  id: string;
  date: Date;
  checkIn: Date;
  checkOut: Date | null;
  totalMinutes: number;
  extraMinutes: number;
  shift: WorkShift | null;
  tips: number;
}

import { WorkShift } from '@prisma/client';

export class WeeklyHistoryDto {
  date: string;
  weekDay: number;
  workedMinutes: number;
  extraMinutes: number;
  tips: number;
  sessions: {
    checkIn: Date;
    checkOut: Date | null;
    shift: WorkShift | null;
  }[];
}

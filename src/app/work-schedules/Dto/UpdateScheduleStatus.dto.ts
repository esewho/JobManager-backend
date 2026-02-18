import { ScheduleStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSheduleStatusDto {
  @IsEnum(ScheduleStatus)
  status: ScheduleStatus;
}

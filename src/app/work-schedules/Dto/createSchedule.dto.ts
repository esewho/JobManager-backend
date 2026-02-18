import { IsDateString, IsUUID } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  userWorkspaceId: string;
  @IsDateString()
  date: Date;
  @IsDateString()
  startTime: Date;
  @IsDateString()
  endTime: Date;
}

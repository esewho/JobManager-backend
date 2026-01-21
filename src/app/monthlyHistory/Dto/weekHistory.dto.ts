import { DayHistoryDto } from './dayHistory.dto';

export class WeekHistoryDto {
  weekStart: string;
  weekEnd: string;
  days: DayHistoryDto[];
}

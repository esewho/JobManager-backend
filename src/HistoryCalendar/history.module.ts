import { Module } from '@nestjs/common';
import { HistoryCalendarController } from './history-calendar.controller';
import { HistoryCalendarService } from './history-calendar.service';

@Module({
  controllers: [HistoryCalendarController],
  providers: [HistoryCalendarService],
})
export class HistoryCalendarModule {}

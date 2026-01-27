import { Module } from '@nestjs/common';

import { WeeklyHistoryController } from './weekly-history.controller';
import { WeeklyHistoryService } from './weekly-history.service';

@Module({
  controllers: [WeeklyHistoryController],
  providers: [WeeklyHistoryService],
})
export class WeeklyHistoryModule {}

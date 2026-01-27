import { Module } from '@nestjs/common';
import { MonthlyHistoryService } from './monthlyHistory.service';
import { MonthlyHistoryController } from './monthlyHistory.controller';

@Module({
  controllers: [MonthlyHistoryController],
  providers: [MonthlyHistoryService],
})
export class MonthlyHistoryModule {}

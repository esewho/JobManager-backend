import { Module } from '@nestjs/common';
import { MonthlyHistoryService } from './monthlyHistory.service';
import { MonthlyHistoryController } from './monthlyHistory.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MonthlyHistoryController],
  providers: [MonthlyHistoryService, PrismaService],
})
export class MonthlyHistoryModule {}

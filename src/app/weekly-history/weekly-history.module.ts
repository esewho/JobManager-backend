import { Module } from '@nestjs/common';

import { WeeklyHistoryController } from './weekly-history.controller';
import { WeeklyHistoryService } from './weekly-history.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [WeeklyHistoryController],
  providers: [WeeklyHistoryService, PrismaService],
})
export class WeeklyHistoryModule {}

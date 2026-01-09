import { Module } from '@nestjs/common';
import { TipPoolController } from './tip-pool.controller';
import { TipPoolService } from './tip-pool.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TipPoolController],
  providers: [TipPoolService, PrismaService],
})
export class TipPoolModule {}

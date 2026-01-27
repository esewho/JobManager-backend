import { Module } from '@nestjs/common';
import { TipPoolController } from './tip-pool.controller';
import { TipPoolService } from './tip-pool.service';

@Module({
  controllers: [TipPoolController],
  providers: [TipPoolService],
})
export class TipPoolModule {}

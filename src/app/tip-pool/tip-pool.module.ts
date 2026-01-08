import { Module, Global } from '@nestjs/common';
import { TipPoolController } from './tip-pool.controller';
import { TipPoolService } from './tip-pool.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Global()
@Module({
  controllers: [TipPoolController],
  providers: [TipPoolService, PrismaService],
})
export class TipPoolModule {}

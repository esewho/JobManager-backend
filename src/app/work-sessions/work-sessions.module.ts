import { PrismaService } from './../../prisma/prisma.service';
import { Module, Global } from '@nestjs/common';
import { WorkSessionsService } from './work-sessions.service';
import { WorkSessionsController } from './work-sessions.controller';

@Global()
@Module({
  controllers: [WorkSessionsController],
  providers: [WorkSessionsService, PrismaService],
  exports: [WorkSessionsService],
})
export class WorkSessionsModule {}

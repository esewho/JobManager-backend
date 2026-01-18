import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './app/auth/auth.module';
import { WorkSessionsModule } from './app/work-sessions/work-sessions.module';
import { TipPoolModule } from './app/tip-pool/tip-pool.module';
import { AdminModule } from './app/admin/admin.module';
import { UserDataModule } from './user/user-data.module';
import { WeeklyHistoryModule } from './app/weekly-history/weekly-history.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WorkSessionsModule,
    TipPoolModule,
    AdminModule,
    UserDataModule,
    WeeklyHistoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

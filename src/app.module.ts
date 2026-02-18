import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './app/auth/auth.module';
import { WorkSessionsModule } from './app/work-sessions/work-sessions.module';
import { TipPoolModule } from './app/tip-pool/tip-pool.module';
import { AdminModule } from './app/admin/admin.module';
import { UserDataModule } from './user/user-data.module';
import { WeeklyHistoryModule } from './app/weekly-history/weekly-history.module';
import { MonthlyHistoryModule } from './app/monthlyHistory/monthlyHistory.module';
import { WorkspaceModule } from './app/Workspace/workspace.module';
import { WorkSchedulesModule } from './app/work-schedules/work-schedules.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    WorkSessionsModule,
    TipPoolModule,
    AdminModule,
    UserDataModule,
    WeeklyHistoryModule,
    MonthlyHistoryModule,
    WorkspaceModule,
    WorkSchedulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

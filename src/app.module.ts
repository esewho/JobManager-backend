import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './app/auth/auth.module';
import { WorkSessionsModule } from './app/work-sessions/work-sessions.module';
import { TipPoolModule } from './app/tip-pool/tip-pool.module';
import { AdminModule } from './app/admin/admin.module';
import { UserDataModule } from './user/user-data.module';
import { WorkspaceModule } from './app/Workspace/workspace.module';
import { WorkSchedulesModule } from './app/work-schedules/work-schedules.module';
import { HistoryCalendarModule } from './HistoryCalendar/history.module';
import { SettingsModule } from './app/userSettings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    WorkSessionsModule,
    TipPoolModule,
    AdminModule,
    UserDataModule,
    WorkspaceModule,
    WorkSchedulesModule,
    HistoryCalendarModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

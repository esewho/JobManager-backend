import { Controller, UseGuards, Get, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from 'src/app/common/guards/jwt-auth.guard';
import { HistoryCalendarService } from './history-calendar.service';
import { User } from 'src/app/common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryCalendarController {
  constructor(
    private readonly historyCalendarService: HistoryCalendarService,
  ) {}

  @Get('calendar')
  async getCalendarMonth(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.historyCalendarService.getCalendarMonth(
      userId,
      workspaceId,
      Number(month),
      Number(year),
    );
  }

  @Get('workspace/:workspaceId/:date')
  async getDayDetail(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('date') date: string,
  ) {
    return await this.historyCalendarService.getDayDetail(
      userId,
      workspaceId,
      date,
    );
  }
}

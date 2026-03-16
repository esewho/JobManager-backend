import { Controller, UseGuards, Get, Query } from '@nestjs/common';
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
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.historyCalendarService.getCalendarMonth(
      userId,
      Number(month),
      Number(year),
    );
  }
}

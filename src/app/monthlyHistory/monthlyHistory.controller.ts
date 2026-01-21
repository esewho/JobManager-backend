import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MonthlyHistoryService } from './monthlyHistory.service';
import { User } from '../common/decorators/user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('monthly-history')
@UseGuards(JwtAuthGuard)
export class MonthlyHistoryController {
  constructor(private readonly monthlyHistoryService: MonthlyHistoryService) {}

  @Get('me')
  async getMonthlyHistory(@User('userId') userId: string) {
    return this.monthlyHistoryService.getMonths(userId);
  }

  @Get('me/:month/:year/weeks')
  async getWeeksInMonth(
    @User('userId') userId: string,
    @Param('month') month: string,
    @Param('year') year: string,
  ) {
    return this.monthlyHistoryService.getWeeksOfMonth(
      userId,
      parseInt(month),
      parseInt(year),
    );
  }
}

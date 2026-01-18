import { Controller, Get, UseGuards } from '@nestjs/common';
import { WeeklyHistoryService } from './weekly-history.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user-id.decorator';
import { WeeklyHistoryDto } from './Dto/weeklyHistory.dto';

@Controller('weekly-history')
@UseGuards(JwtAuthGuard)
export class WeeklyHistoryController {
  constructor(private readonly weeklyHistoryService: WeeklyHistoryService) {}

  @Get('me')
  async getWeeklyHistory(
    @User('userId') userId: string,
  ): Promise<WeeklyHistoryDto[]> {
    return this.weeklyHistoryService.getWeeklyHistory(userId);
  }
}

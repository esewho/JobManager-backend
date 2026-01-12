import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TipPoolService } from './tip-pool.service';
import { TipPoolDto } from './Dto/tipPool.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { User } from '../common/decorators/user-id.decorator';

@Controller('tip-pool')
export class TipPoolController {
  constructor(private readonly tipPoolService: TipPoolService) {}
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async createTipPool(@Body() dto: TipPoolDto) {
    return await this.tipPoolService.createTipPool(dto);
  }

  @Get('my-daily-tips')
  @UseGuards(JwtAuthGuard)
  async getMyDailyTips(@User('userId') userId: string) {
    return await this.tipPoolService.getMyDailyTips(userId);
  }

  @Get('summary-tips')
  @UseGuards(JwtAuthGuard)
  async getMyTipSummary(@User('userId') userId: string) {
    return await this.tipPoolService.getMyTipSummary(userId);
  }
}

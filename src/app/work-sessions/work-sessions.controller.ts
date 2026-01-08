import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WorkSessionsService } from './work-sessions.service';
import { User } from '../common/decorators/user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('work-sessions')
export class WorkSessionsController {
  constructor(private readonly workSessionsService: WorkSessionsService) {}
  @Post('check-in')
  async checkIn(@User('userId') userId: string) {
    return await this.workSessionsService.checkIn(userId);
  }

  @Post('check-out')
  async checkOut(@User('userId') userId: string) {
    return await this.workSessionsService.checkOut(userId);
  }

  @Get('me')
  async getMySessions(@User('userId') userId: string) {
    return await this.workSessionsService.getSessionsByUser(userId);
  }
}

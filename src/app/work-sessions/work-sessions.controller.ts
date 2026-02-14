import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkSessionsService } from './work-sessions.service';
import { User } from '../common/decorators/user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('work-sessions')
export class WorkSessionsController {
  constructor(private readonly workSessionsService: WorkSessionsService) {}
  @Post('check-in')
  async checkIn(
    @User('userId') userId: string,
    @Body('workspaceId') workspaceId: string,
  ) {
    return await this.workSessionsService.checkIn(userId, workspaceId);
  }

  @Post('check-out')
  async checkOut(
    @User('userId') userId: string,
    @Body('worspaceId') workspaceId: string,
  ) {
    return await this.workSessionsService.checkOut(userId, workspaceId);
  }

  @Get('me')
  async getSessionsByUser(@User('userId') userId: string) {
    return await this.workSessionsService.getSessionsByUser(userId);
  }

  @Get('me-summary')
  async getMySummary(
    @User('userId') userId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return await this.workSessionsService.getMySummary(userId, workspaceId);
  }

  @Get('me/today/:workspaceId')
  async getTodaySession(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return await this.workSessionsService.getTodaySession(userId, workspaceId);
  }

  @Get('/me/mySessions/:workspaceId')
  async getMySessions(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return await this.workSessionsService.getMySessions(userId, workspaceId);
  }
}

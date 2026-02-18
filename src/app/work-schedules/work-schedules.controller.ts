import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkSchedulesService } from './work-schedules.service';

import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateScheduleDto } from './Dto/createSchedule.dto';
import { UpdateSheduleStatusDto } from './Dto/UpdateScheduleStatus.dto';
import { UpdateScheduleDto } from './Dto/UpdateSchedule.dto';
import { User } from '../common/decorators/user-id.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('/work-schedules')
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  @Roles(Role.ADMIN)
  @Post(':workspaceId')
  async createSchedule(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.workSchedulesService.createSchedule(dto, workspaceId);
  }

  @Roles(Role.ADMIN)
  @Get(':workspaceId')
  async getSchedulesOfWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.workSchedulesService.getSchedulesOfWorkspace(workspaceId);
  }

  @Roles(Role.ADMIN)
  @Patch(':workspaceId/:id')
  async updateSchedule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.workSchedulesService.updateSchedule(
      scheduleId,
      workspaceId,
      dto,
    );
  }

  @Roles(Role.ADMIN)
  @Delete(':workspaceId/:id')
  async deleteSchedule(
    @Param('workspaceId') workspaceId: string,
    @Param('id') scheduleId: string,
  ) {
    return this.workSchedulesService.deleteSchedule(scheduleId, workspaceId);
  }

  @Roles(Role.EMPLOYEE)
  @Get('me/:workspaceId')
  async getMySchedules(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workSchedulesService.getMySchedules(userId, workspaceId);
  }

  @Roles(Role.EMPLOYEE)
  @Patch('/me/:workspaceId/:id')
  async updateScheduleStatus(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('id') scheduleId: string,
    @Body() dto: UpdateSheduleStatusDto,
  ) {
    return this.workSchedulesService.updateScheduleStatus(
      userId,
      workspaceId,
      scheduleId,
      dto.status,
    );
  }
}

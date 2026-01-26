import { AdminService } from './admin.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UserStatusDto } from './Dto/userStatus.dto';
import { UpdateSessionShift } from './Dto/updateSessionShift.dto';
import { CreateUserDto } from './Dto/createUser.dto';
import { User } from '../common/decorators/user-id.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly AdminService: AdminService) {}
  @Patch('users/:id/status')
  async setUserActiveStatus(
    @Param('id') userId: string,
    @Body() userStatusDto: UserStatusDto,
  ) {
    return await this.AdminService.setActiveOrDeactivateUser(
      userId,
      userStatusDto.active,
    );
  }

  @Get('working-users')
  async getWorkingUsers() {
    return await this.AdminService.getWorkingUsers();
  }

  @Patch('work-sessions/:id/shift')
  async updateWorkSessionShift(
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionShift,
  ) {
    return await this.AdminService.updateWorkSessionShift(sessionId, dto.shift);
  }

  @Get('all-work-sessions')
  async getAllWorkSessions() {
    return await this.AdminService.getAllWorkSessions();
  }

  @Get('all-tipPools')
  async getAllTipsPools() {
    return await this.AdminService.getAllTipsPools();
  }

  @Post('create-employee/:workspaceId')
  async createEmployee(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateUserDto,
    @User('userId') adminId: string,
  ) {
    return await this.AdminService.createEmployee(dto, workspaceId, adminId);
  }
}

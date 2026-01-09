import { AdminService } from './admin.service';
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UserStatusDto } from './Dto/userStatus.dto';

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
}

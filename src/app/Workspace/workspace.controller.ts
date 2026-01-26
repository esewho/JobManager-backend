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
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { WorkspaceDto } from './Dto/workspace.dto';
import { User } from '../common/decorators/user-id.decorator';
import { WorkspaceGuard } from '../common/guards/workspace.guard';

@UseGuards(JwtAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post('create')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async createWorkspace(
    @Body() dto: WorkspaceDto,
    @User('userId') userId: string,
  ) {
    return await this.workspaceService.createWorkspace(dto, userId);
  }

  @Get('me')
  async getWorkspaces(@User('userId') userId: string) {
    return await this.workspaceService.getAllWorkspaces(userId);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceGuard)
  async getWorkspaceById(@Param('workspaceId') workspaceId: string) {
    return await this.workspaceService.getWorkspaceById(workspaceId);
  }

  @Patch('update/:workspaceId')
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.ADMIN)
  async updateWorkspace(
    @Body() dto: WorkspaceDto,
    @Param('workspaceId') workspaceId: string,
    @User('userId') userId: string,
  ) {
    return await this.workspaceService.updateWorkspace(
      workspaceId,
      dto,
      userId,
    );
  }
  @Delete('delete/:workspaceId')
  @UseGuards(RolesGuard, WorkspaceGuard)
  @Roles(Role.ADMIN)
  async deleteWorkspace(
    @User('userId') userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return await this.workspaceService.deleteWorkspace(workspaceId, userId);
  }
}

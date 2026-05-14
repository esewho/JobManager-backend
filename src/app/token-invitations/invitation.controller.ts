import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from 'src/app/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/app/common/guards/roles.guard';
import { CreateInvitationDto } from './Dto/invitation.dto';
import { AcceptInvitationDto } from './Dto/acceptInvitation.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':workspaceId')
  async createInvitation(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return await this.invitationService.createInvitation(
      dto.email,
      workspaceId,
    );
  }

  @Get(':token')
  async getInvitationByToken(@Param('token') token: string) {
    return await this.invitationService.getInvitationByToken(token);
  }

  @Post('accept/:token')
  async acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return await this.invitationService.acceptInvitation(token, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async deleteInvitation(@Param('id') id: string) {
    return await this.invitationService.deleteInvitation(id);
  }

  @Get('workspace/:workspaceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async listAllInvitations(@Param('workspaceId') workspaceId: string) {
    return await this.invitationService.listAllInvitations(workspaceId);
  }
}

import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from 'src/app/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/app/common/guards/roles.guard';
import { CreateInvitationDto } from '../invitation.dto';

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
}

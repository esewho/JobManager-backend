import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from 'src/prisma/prisma';
import { AcceptInvitationDto } from './Dto/acceptInvitation.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InvitationService {
  async createInvitation(email: string, workspaceId: string) {
    if (!email || !workspaceId) {
      throw new BadRequestException('Email and workspaceId are required');
    }
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: email,
        workspaceId: workspaceId,
      },
    });
    if (existingInvitation) {
      throw new BadRequestException(
        'Invitation already exists for this email and workspace',
      );
    }

    const token = randomUUID();

    return await prisma.workspaceInvitation.create({
      data: {
        email,
        workspaceId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira en 7 dias
      },
    });
  }

  async getInvitationByToken(token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.accepted) {
      throw new BadRequestException('Invitation has already been accepted');
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }
    return invitation;
  }

  async acceptInvitation(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.getInvitationByToken(token);
    if (invitation.email !== dto.email) {
      throw new BadRequestException('Email does not match invitation');
    }
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });
    if (existingUser) {
      throw new BadRequestException(
        'User with this email or username already exists',
      );
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        role: invitation.role,
        active: true,
      },
    });
    await prisma.userWorkspace.create({
      data: {
        userId: user.id,
        workspaceId: invitation.workspaceId,
        role: invitation.role,
      },
    });
    await prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { accepted: true },
    });
    return { message: 'Invitation accepted successfully' };
  }

  async deleteInvitation(id: string) {
    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { id },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    await prisma.workspaceInvitation.delete({
      where: { id },
    });
    return { message: 'Invitation deleted successfully' };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from 'src/prisma/prisma';
import { AcceptInvitationDto } from './Dto/acceptInvitation.dto';
import * as bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class InvitationService {
  constructor(private jwt: JwtService) {}
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

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        email,
        workspaceId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expira en 7 dias
      },
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'JobManager <onboarding@resend.dev>',
      to: [email],
      subject: 'You have been invited to join a workspace',
      html: `<p>You have been invited to join a workspace. Please click the link below to accept the invitation:</p>
              <p><a href="http://localhost:3000/invitations/accept/token=${token}">Accept Invitation</a></p>`,
    });

    return invitation;
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

    const accessToken = this.jwt.sign({
      sub: user.id,
      role: user.role,
      workspaceId: invitation.workspaceId,
    });
    return { message: 'Invitation accepted successfully', accessToken };
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

  async listAllInvitations(workspaceId: string) {
    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required');
    }
    return await prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        accepted: true,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from 'src/prisma/prisma';

@Injectable()
export class InvitationService {
  async createInvitation(email: string, workspaceId: string) {
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: email,
        workspaceId: workspaceId,
      },
    });
    if (existingInvitation) {
      throw new Error('Invitation already exists for this email and workspace');
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
}

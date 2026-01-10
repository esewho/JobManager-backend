import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WorkSessionStatus, WorkShift } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  async setActiveOrDeactivateUser(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { active: isActive },
    });
    return {
      message: `User has been ${isActive ? 'activated' : 'deactivated'}`,
    };
  }

  async getWorkingUsers() {
    const sessions = await this.prisma.workSession.findMany({
      where: { status: WorkSessionStatus.OPEN },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
    return sessions.map((session) => ({
      userId: session.user.id,
      username: session.user.username,
      checkIn: session.checkIn,
      role: session.user.role,
    }));
  }

  async updateWorkSessionShift(sessionId: string, shift: WorkShift) {
    const session = await this.prisma.workSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Work session not found');
    }
    if (session.status !== WorkSessionStatus.CLOSED) {
      throw new BadRequestException('Only closed sessions can be updated');
    }
    return await this.prisma.workSession.update({
      where: { id: sessionId },
      data: { shift },
    });
  }
}

import { WorkSessionStatus } from '@prisma/client';
import { PrismaService } from './../../prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkSessionDto } from './Dto/work-session.dto';

@Injectable()
export class WorkSessionsService {
  constructor(private readonly prisma: PrismaService) {}
  async checkIn(userId: string): Promise<WorkSessionDto> {
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const openSession = await this.prisma.workSession.findFirst({
      where: { userId: user.id, status: WorkSessionStatus.OPEN },
    });
    if (openSession) {
      throw new BadRequestException(
        'There is already an open work session for this user',
      );
    }

    const session = await this.prisma.workSession.create({
      data: {
        userId: user.id,
        checkIn: now,
        status: WorkSessionStatus.OPEN,
        totalMinutes: 0,
        extraMinutes: 0,
      },
    });
    return {
      id: session.id,
      checkIn: session.checkIn,
      checkOut: undefined,
      totalMinutes: session.totalMinutes,
      extraMinutes: session.extraMinutes,
      status: session.status,
    };
  }

  async checkOut(userId: string): Promise<WorkSessionDto> {
    const WORKDAY_MINUTES = 8 * 60;
    const now = new Date();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const openSession = await this.prisma.workSession.findFirst({
      where: { userId: user.id, status: WorkSessionStatus.OPEN },
    });
    if (!openSession) {
      throw new BadRequestException(
        'There is no open work session for this user',
      );
    }

    const checkIn = openSession.checkIn;
    const diffMs = now.getTime() - checkIn.getTime();
    const diffMins = Math.max(Math.floor(diffMs / 60000), 0);
    const extraTime = Math.max(diffMins - WORKDAY_MINUTES, 0);

    const updatedSession = await this.prisma.workSession.update({
      where: { id: openSession.id },
      data: {
        checkOut: now,
        totalMinutes: diffMins,
        extraMinutes: extraTime,
        status: WorkSessionStatus.CLOSED,
      },
    });

    return {
      id: updatedSession.id,
      checkIn: updatedSession.checkIn,
      checkOut: updatedSession.checkOut!,
      totalMinutes: updatedSession.totalMinutes,
      extraMinutes: updatedSession.extraMinutes,
      status: updatedSession.status,
    };
  }

  async getSessionsByUser(userId: string): Promise<WorkSessionDto[]> {
    const sessions = await this.prisma.workSession.findMany({
      where: { userId },
      orderBy: { checkIn: 'desc' },
    });
    return sessions.map((session) => {
      return {
        id: session.id,
        checkIn: session.checkIn,
        checkOut: session.checkOut || undefined,
        totalMinutes: session.totalMinutes,
        extraMinutes: session.extraMinutes,
        status: session.status,
      };
    });
  }
}

import { WorkSessionStatus } from '@prisma/client';
import { PrismaService } from './../../prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkSessionDto } from './Dto/work-session.dto';

function startOfDayUTC(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
    ),
  );
}

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
      shift: session.shift,
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
      shift: updatedSession.shift,
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
        shift: session.shift,
      };
    });
  }

  async getMySummary(userId: string) {
    const now = new Date();

    const startToday = startOfDayUTC(now);

    const startWeek = new Date(startToday);
    startWeek.setUTCDate(startWeek.getUTCDate() - startWeek.getUTCDay());

    const startMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [todayHours, weekHours, monthHours, todayTips, weekTips, monthTips] =
      await Promise.all([
        this.prisma.workSession.aggregate({
          where: {
            userId,
            status: WorkSessionStatus.CLOSED,
            checkIn: { gte: startToday },
          },
          _sum: {
            totalMinutes: true,
            extraMinutes: true,
          },
        }),
        this.prisma.workSession.aggregate({
          where: {
            userId,
            status: WorkSessionStatus.CLOSED,
            checkIn: { gte: startWeek },
          },
          _sum: {
            totalMinutes: true,
            extraMinutes: true,
          },
        }),
        this.prisma.workSession.aggregate({
          where: {
            userId,
            status: WorkSessionStatus.CLOSED,
            checkIn: { gte: startMonth },
          },
          _sum: {
            totalMinutes: true,
            extraMinutes: true,
          },
        }),
        this.prisma.tipDistribution.aggregate({
          where: {
            userId,
            tipPool: { date: { gte: startToday } },
          },
          _sum: { amount: true },
        }),
        this.prisma.tipDistribution.aggregate({
          where: {
            userId,
            tipPool: { date: { gte: startWeek } },
          },
          _sum: { amount: true },
        }),
        this.prisma.tipDistribution.aggregate({
          where: {
            userId,
            tipPool: { date: { gte: startMonth } },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      today: {
        workedMinutes: todayHours._sum.totalMinutes ?? 0,
        extraMinutes: todayHours._sum.extraMinutes ?? 0,
        tips: todayTips._sum.amount ?? 0,
      },
      thisWeek: {
        workedMinutes: weekHours._sum.totalMinutes ?? 0,
        extraMinutes: weekHours._sum.extraMinutes ?? 0,
        tips: weekTips._sum.amount ?? 0,
      },
      thisMonth: {
        workedMinutes: monthHours._sum.totalMinutes ?? 0,
        extraMinutes: monthHours._sum.extraMinutes ?? 0,
        tips: monthTips._sum.amount ?? 0,
      },
    };
  }

  async getTodaySession(userId: string): Promise<WorkSessionDto | null> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const session = await this.prisma.workSession.findFirst({
      where: {
        userId,
        checkIn: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { checkIn: 'desc' },
    });
    if (!session) {
      return {
        checkIn: null,
        checkOut: null,
        totalMinutes: 0,
        extraMinutes: 0,
        status: WorkSessionStatus.CLOSED,
        shift: null,
      };
    }
    return {
      checkIn: session.checkIn || null,
      checkOut: session.checkOut || null,
      totalMinutes: session.totalMinutes,
      extraMinutes: session.extraMinutes,
      status: session.status,
      shift: session.shift,
    };
  }
}

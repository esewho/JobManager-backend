import { WorkSessionStatus } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkSessionDto } from './Dto/work-session.dto';
import { WorkHistoryDto } from './Dto/work-history.dto';
import { prisma } from 'src/prisma/prisma';
import { TodaySessionDto } from './Dto/today-session.dto';

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
function startOfWeekUTC(date: Date) {
  const day = date.getUTCDay(); // 0 = domingo, 1 = lunes...
  const diff = day === 0 ? -6 : 1 - day;

  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() + diff);
  start.setUTCHours(0, 0, 0, 0);

  return start;
}

function startOfMonthUTC(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0),
  );
}

@Injectable()
export class WorkSessionsService {
  async checkIn(userId: string, workspaceId: string): Promise<WorkSessionDto> {
    const now = new Date();
    const user = await prisma.userWorkspace.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { userId: true },
    });
    if (!user) {
      throw new NotFoundException('User or workspace not found');
    }

    const openSession = await prisma.workSession.findFirst({
      where: {
        userId,
        workspaceId,
        status: WorkSessionStatus.OPEN,
      },
    });

    if (!workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (openSession) {
      await prisma.workSession.update({
        where: { id: openSession.id },
        data: {
          status: WorkSessionStatus.CLOSED,
          checkOut: now,
        },
      });
    }
    if (openSession) {
      throw new BadRequestException(
        'There is already an open work session for this user',
      );
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const session = await prisma.workSession.create({
      data: {
        userId: userId,
        workspaceId: workspaceId,
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

  async checkOut(userId: string, workspaceId: string): Promise<WorkSessionDto> {
    const WORKDAY_MINUTES = 8 * 60;
    const now = new Date();

    const openSession = await prisma.workSession.findFirst({
      where: {
        userId,
        workspaceId,
        status: WorkSessionStatus.OPEN,
      },
      include: { pauses: true },
    });

    if (!openSession) {
      throw new BadRequestException(
        'There is no open work session for this workspace',
      );
    }

    const diffMs = now.getTime() - openSession.checkIn.getTime();
    const diffMins = Math.max(Math.floor(diffMs / 60000), 0);

    await prisma.workPause.updateMany({
      where: {
        sessionId: openSession.id,
        endTime: null,
      },
      data: { endTime: now },
    });

    const session = await prisma.workSession.findUnique({
      where: { id: openSession.id },
      include: { pauses: true },
    });

    if (!session)
      throw new BadRequestException(
        'There is no open work session to this workspace',
      );

    const pausedMinutes = session.pauses.reduce((acc, p) => {
      const end = p.endTime ?? now;
      const diff = end.getTime() - p.startTime.getTime();

      return acc + Math.floor(diff / 60000);
    }, 0);

    const workedMinutes = Math.max(diffMins - pausedMinutes, 0);
    const extraTime = Math.max(workedMinutes - WORKDAY_MINUTES, 0);

    await prisma.workPause.updateMany({
      where: {
        sessionId: openSession.id,
        endTime: null,
      },
      data: {
        endTime: now,
      },
    });

    const updatedSession = await prisma.workSession.update({
      where: { id: openSession.id },
      data: {
        checkOut: now,
        totalMinutes: workedMinutes,
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

  async pauseSession(userId: string, workspaceId: string) {
    const session = await prisma.workSession.findFirst({
      where: {
        userId,
        workspaceId,
        checkOut: null,
      },
      include: { pauses: true },
    });

    if (!session) {
      throw new BadRequestException('No active session');
    }

    const activePause = session.pauses.find((p) => !p.endTime);

    if (activePause) {
      // REANUDAR
      await prisma.workPause.update({
        where: { id: activePause.id },
        data: { endTime: new Date() },
      });

      await prisma.workSession.update({
        where: { id: session.id },
        data: { status: 'OPEN' },
      });

      return { isPaused: false };
    }

    // PAUSAR
    await prisma.workPause.create({
      data: {
        sessionId: session.id,
        startTime: new Date(),
      },
    });

    await prisma.workSession.update({
      where: { id: session.id },
      data: { status: 'PAUSED' },
    });

    return { isPaused: true };
  }

  async getSessionsByUser(userId: string): Promise<WorkSessionDto[]> {
    const sessions = await prisma.workSession.findMany({
      where: { userId },
      include: { pauses: true },
      orderBy: { checkIn: 'desc' },
    });

    return sessions.map((session) => {
      return {
        id: session.id,
        checkIn: session.checkIn,
        checkOut: session.checkOut || undefined,
        isPaused: session.pauses.some((p) => !p.endTime),
        totalMinutes: session.totalMinutes,
        extraMinutes: session.extraMinutes,
        status: session.status,
        shift: session.shift,
      };
    });
  }

  async getMySummary(userId: string, workspaceId: string) {
    const now = new Date();

    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    const startWeek = new Date(startToday);
    startWeek.setUTCDate(startWeek.getUTCDate() - startWeek.getUTCDay());

    const startMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [todayHours, weekHours, monthHours, todayTips, weekTips, monthTips] =
      await Promise.all([
        prisma.workSession.aggregate({
          where: {
            userId,
            workspaceId,
            status: WorkSessionStatus.CLOSED,
            checkIn: { gte: startToday },
          },
          _sum: {
            totalMinutes: true,
            extraMinutes: true,
          },
        }),
        prisma.workSession.aggregate({
          where: {
            userId,
            workspaceId,
            status: WorkSessionStatus.CLOSED,
            checkIn: { gte: startWeek },
          },
          _sum: {
            totalMinutes: true,
            extraMinutes: true,
          },
        }),
        prisma.workSession.aggregate({
          where: {
            userId,
            workspaceId,
            status: WorkSessionStatus.CLOSED,
            checkIn: { gte: startMonth },
          },
          _sum: {
            totalMinutes: true,
            extraMinutes: true,
          },
        }),
        prisma.tipDistribution.aggregate({
          where: {
            userId,
            tipPool: { date: { gte: startToday } },
          },
          _sum: { amount: true },
        }),
        prisma.tipDistribution.aggregate({
          where: {
            userId,
            tipPool: { date: { gte: startWeek } },
          },
          _sum: { amount: true },
        }),
        prisma.tipDistribution.aggregate({
          where: {
            userId,
            tipPool: { date: { gte: startMonth } },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      today: {
        date: startToday,
        workedMinutes: todayHours._sum.totalMinutes ?? 0,
        extraMinutes: todayHours._sum.extraMinutes ?? 0,
        tips: todayTips._sum.amount ?? 0,
      },
      thisWeek: {
        date: startWeek,
        workedMinutes: weekHours._sum.totalMinutes ?? 0,
        extraMinutes: weekHours._sum.extraMinutes ?? 0,
        tips: weekTips._sum.amount ?? 0,
      },
      thisMonth: {
        date: startMonth,
        workedMinutes: monthHours._sum.totalMinutes ?? 0,
        extraMinutes: monthHours._sum.extraMinutes ?? 0,
        tips: monthTips._sum.amount ?? 0,
      },
    };
  }

  async getTodaySession(
    userId: string,
    workspaceId: string,
  ): Promise<TodaySessionDto | null> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const session = await prisma.workSession.findFirst({
      where: {
        userId,
        workspaceId,
        checkIn: {
          gte: start,
          lte: end,
        },
      },
      include: { pauses: true },
      orderBy: { checkIn: 'desc' },
    });
    if (!session) {
      return {
        checkIn: null,
        checkOut: null,
        isPaused: false,
        totalMinutes: 0,
        extraMinutes: 0,
        status: WorkSessionStatus.CLOSED,
        shift: null,
      };
    }
    const isPaused = session?.pauses.some((p) => !p.endTime);
    console.log(isPaused, 'tukissssss');

    return {
      checkIn: session.checkIn ?? null,
      checkOut: session.checkOut ?? null,
      isPaused,
      totalMinutes: session.totalMinutes,
      extraMinutes: session.extraMinutes,
      status: session.status,
      shift: session.shift,
    };
  }

  async getMyHistory(
    userId: string,
    period: 'today' | 'week' | 'month',
  ): Promise<WorkHistoryDto[]> {
    const now = new Date();
    let from: Date;

    switch (period) {
      case 'today':
        from = startOfDayUTC(now);
        break;
      case 'week':
        from = startOfWeekUTC(now);
        break;
      case 'month':
        from = startOfMonthUTC(now);
        break;
      default:
        throw new BadRequestException('Invalid period');
    }

    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        status: WorkSessionStatus.CLOSED,
        checkIn: { gte: from },
      },
    });

    const tips = await prisma.tipDistribution.findMany({
      where: {
        userId,
        tipPool: {
          date: { gte: from },
        },
      },
      include: {
        tipPool: true,
      },
    });

    const history = new Map<string, WorkHistoryDto>();

    // sesiones → tiempo
    for (const s of sessions) {
      const dayKey = startOfDayUTC(s.checkIn).toISOString();

      if (!history.has(dayKey)) {
        history.set(dayKey, {
          checkIn: now,
          checkOut: null,
          id: sessions[0].id,
          shift: null,
          date: startOfDayUTC(s.checkIn),
          totalMinutes: 0,
          extraMinutes: 0,
          tips: 0,
        });
      }

      const entry = history.get(dayKey)!;
      entry.totalMinutes += s.totalMinutes;
      entry.extraMinutes += s.extraMinutes;
    }

    // tips → dinero
    for (const t of tips) {
      const dayKey = startOfDayUTC(t.tipPool.date).toISOString();

      if (!history.has(dayKey)) {
        history.set(dayKey, {
          checkIn: now,
          checkOut: null,
          id: '',
          shift: null,
          date: startOfDayUTC(t.tipPool.date),
          totalMinutes: 0,
          extraMinutes: 0,
          tips: 0,
        });
      }

      history.get(dayKey)!.tips += t.amount;
    }

    return Array.from(history.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }

  async getMySessions(
    userId: string,
    workspaceId: string,
  ): Promise<WorkSessionDto[]> {
    const userOfWorkspace = await prisma.userWorkspace.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });
    if (!userOfWorkspace)
      throw new NotFoundException('User no encontrado en este workspace');

    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        workspaceId,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        pauses: { where: { endTime: null }, select: { id: true } },
        _count: { select: { pauses: true } },
      },
      orderBy: {
        checkIn: 'desc',
      },
      take: 5,
    });
    return sessions.map((s) => ({
      id: s.id,
      checkIn: s.checkIn,
      checkOut: s.checkOut || null,
      totalMinutes: s.totalMinutes,
      extraMinutes: s.extraMinutes,
      status: s.status,
      shift: s.shift,
      isPaused: s.pauses.length > 0,
      pauseCount: s._count.pauses,
      user: s.user,
    }));
  }
}

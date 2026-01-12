import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipPoolDto } from './Dto/tipPool.dto';
import { WorkSessionStatus } from '@prisma/client';
import { start } from 'repl';

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

@Injectable()
export class TipPoolService {
  constructor(private readonly prisma: PrismaService) {}

  async createTipPool(dto: TipPoolDto) {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    const existingPool = await this.prisma.tipPool.findUnique({
      where: { date_shift: { date, shift: dto.shift } },
    });
    if (existingPool) {
      throw new BadRequestException('Tip pool for this date already exists');
    }

    const { start, end } = getDayRange(date);

    const result = await this.prisma.$transaction(async (tx) => {
      const openSessions = await tx.workSession.findMany({
        where: {
          status: WorkSessionStatus.OPEN,
          checkIn: { gte: start, lte: end },
        },
      });

      const now = new Date();
      const WORKDAY_MINUTES = 8 * 60;

      for (const session of openSessions) {
        const diffMs = now.getTime() - session.checkIn.getTime();
        const totalMinutes = Math.max(Math.floor(diffMs / 60000), 0);
        const extraMinutes = Math.max(totalMinutes - WORKDAY_MINUTES, 0);

        await tx.workSession.update({
          where: { id: session.id },
          data: {
            checkOut: now,
            totalMinutes,
            extraMinutes,
            status: WorkSessionStatus.CLOSED,
          },
        });
      }
      const pendingSessions = await tx.workSession.count({
        where: {
          status: WorkSessionStatus.CLOSED,
          checkIn: { gte: start, lte: end },
          shift: null,
        },
      });
      if (pendingSessions > 0) {
        throw new BadRequestException(
          'There are closed sessions without assigned shift',
        );
      }

      const sessions = await tx.workSession.findMany({
        where: {
          status: WorkSessionStatus.CLOSED,
          checkIn: { gte: start, lte: end },
          shift: dto.shift,
        },
        select: { userId: true },
      });

      if (sessions.length === 0) {
        throw new BadRequestException('No work sessions found for this date');
      }

      const uniqueUserIds = [...new Set(sessions.map((s) => s.userId))];
      const workersCount = uniqueUserIds.length;
      const amountPerWorker = Math.floor(dto.totalAmount / workersCount);

      if (amountPerWorker === 0) {
        throw new BadRequestException('Total amount too low');
      }

      const pool = await tx.tipPool.create({
        data: {
          date,
          shift: dto.shift,
          totalAmount: dto.totalAmount,
        },
      });

      await tx.tipDistribution.createMany({
        data: uniqueUserIds.map((userId) => ({
          tipPoolId: pool.id,
          userId,
          amount: amountPerWorker,
        })),
      });

      return { pool, workersCount, amountPerWorker };
    });

    return {
      date: result.pool.date,
      shift: result.pool.shift,
      totalAmount: result.pool.totalAmount,
      workersCount: result.workersCount,
      amountPerWorker: result.amountPerWorker,
    };
  }

  async getMyDailyTips(userId: string) {
    const distributions = await this.prisma.tipDistribution.findMany({
      where: { userId },
      include: {
        tipPool: {
          select: { date: true, totalAmount: true },
        },
      },
      orderBy: { tipPool: { date: 'desc' } },
    });
    return distributions.map((dist) => ({
      date: dist.tipPool.date,
      amount: dist.amount,
      totalPoolAmount: dist.tipPool.totalAmount,
    }));
  }

  async getMyTipSummary(userId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisWeek, thisMonth, total] = await Promise.all([
      this.prisma.tipDistribution.aggregate({
        where: {
          userId,
          tipPool: { date: { gte: startOfToday } },
        },
        _sum: { amount: true },
      }),
      this.prisma.tipDistribution.aggregate({
        where: {
          userId,
          tipPool: { date: { gte: startOfWeek } },
        },
        _sum: { amount: true },
      }),
      this.prisma.tipDistribution.aggregate({
        where: {
          userId,
          tipPool: { date: { gte: startOfMonth } },
        },
        _sum: { amount: true },
      }),
      this.prisma.tipDistribution.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);
    return {
      today: today._sum.amount || 0,
      thisWeek: thisWeek._sum.amount || 0,
      thisMonth: thisMonth._sum.amount || 0,
      total: total._sum.amount || 0,
    };
  }
}

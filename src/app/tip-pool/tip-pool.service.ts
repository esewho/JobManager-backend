import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipPoolDto } from './Dto/tipPool.dto';

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
      where: { date },
    });
    if (existingPool) {
      throw new BadRequestException('Tip pool for this date already exists');
    }

    const { start, end } = getDayRange(date);

    const result = await this.prisma.$transaction(async (tx) => {
      const openSessions = await tx.workSession.findMany({
        where: {
          status: 'OPEN',
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
            status: 'CLOSED',
          },
        });
      }

      const sessions = await tx.workSession.findMany({
        where: {
          status: 'CLOSED',
          checkIn: { gte: start, lte: end },
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
      totalAmount: dto.totalAmount,
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
}

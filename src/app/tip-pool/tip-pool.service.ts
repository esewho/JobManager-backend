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
      where: { date: date },
    });
    if (existingPool) {
      throw new BadRequestException('Tip pool for this date already exists');
    }
    const { start, end } = getDayRange(date);

    const sessions = await this.prisma.workSession.findMany({
      where: {
        checkIn: { gte: start, lte: end },
      },
      select: { userId: true },
    });
    if (sessions.length === 0) {
      throw new BadRequestException(
        'No work sessions found for the specified date',
      );
    }

    const uniqueUserIds = Array.from(
      new Set(sessions.map((session) => session.userId)),
    );

    const workersCount = uniqueUserIds.length;
    const amountPerWorker = Math.floor(dto.totalAmount / workersCount);

    if (amountPerWorker === 0) {
      throw new BadRequestException(
        'Total amount is too low to distribute among workers',
      );
    }

    const tipPool = await this.prisma.$transaction(async (tx) => {
      const pool = await tx.tipPool.create({
        data: {
          date: date,
          totalAmount: dto.totalAmount,
        },
      });
      await tx.tipDistribution.createMany({
        data: uniqueUserIds.map((userId) => ({
          tipPoolId: pool.id,
          userId: userId,
          amount: amountPerWorker,
        })),
      });
      return pool;
    });
    return {
      date: tipPool.date,
      totalAmount: dto.totalAmount,
      workersCount,
      amountPerWorker,
    };
  }

  async getAllTipPools() {
    const tipPools = await this.prisma.tipPool.findMany({
      orderBy: { date: 'desc' },
      include: {
        distributions: {
          select: { id: true },
        },
      },
    });

    return tipPools.map((pool) => {
      const workersCount = pool.distributions.length;
      const amountPerWorker =
        workersCount > 0 ? Math.floor(pool.totalAmount / workersCount) : 0;

      return {
        date: pool.date,
        totalAmount: pool.totalAmount,
        workersCount,
        amountPerWorker,
      };
    });
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

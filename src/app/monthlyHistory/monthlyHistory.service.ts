import { Injectable } from '@nestjs/common';
import { MonthlyHistoryDto } from './Dto/monthlyHistory.dto';
import { WorkSessionStatus } from '@prisma/client';
import { WeekHistoryDto } from './Dto/weekHistory.dto';
import { DayHistoryDto } from './Dto/dayHistory.dto';
import { prisma } from '../../prisma/prisma';
function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

function startOfWeekUTC(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = domingo
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return startOfDayUTC(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)),
  );
}

@Injectable()
export class MonthlyHistoryService {
  async getMonths(userId: string): Promise<MonthlyHistoryDto[]> {
    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        status: WorkSessionStatus.CLOSED,
      },
      select: {
        checkIn: true,
        totalMinutes: true,
        extraMinutes: true,
      },
    });
    const tips = await prisma.tipDistribution.findMany({
      where: {
        userId,
      },
      include: {
        tipPool: true,
      },
    });

    const map = new Map<string, MonthlyHistoryDto>();

    for (const s of sessions) {
      const date = new Date(s.checkIn);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      if (!map.has(key)) {
        map.set(key, {
          month,
          year,
          workedMinutes: 0,
          extraMinutes: 0,
          tips: 0,
        });
      }

      const entry = map.get(key);
      if (entry) {
        entry.workedMinutes += s.totalMinutes;
        entry.extraMinutes += s.extraMinutes;
      }
    }
    for (const t of tips) {
      const date = new Date(t.tipPool.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!map.has(key)) {
        map.set(key, {
          month,
          year,
          workedMinutes: 0,
          extraMinutes: 0,
          tips: 0,
        });
      }
      map.get(key)!.tips += t.amount;
    }
    return Array.from(map.values()).sort(
      (a, b) => b.year - a.year || b.month - a.month,
    );
  }

  async getWeeksOfMonth(
    userId: string,
    month: number,
    year: number,
  ): Promise<WeekHistoryDto[]> {
    const monthStart = startOfDayUTC(new Date(Date.UTC(year, month - 1, 1)));
    const monthEnd = startOfDayUTC(new Date(Date.UTC(year, month, 0)));
    monthEnd.setUTCHours(23, 59, 59, 999);

    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        status: WorkSessionStatus.CLOSED,
        checkIn: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      orderBy: { checkIn: 'asc' },
    });

    const tips = await prisma.tipDistribution.findMany({
      where: {
        userId,
        tipPool: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      },
      include: {
        tipPool: true,
      },
    });
    const weeks: WeekHistoryDto[] = [];
    const cursor = startOfWeekUTC(monthStart);

    while (cursor <= monthEnd) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);

      const days: DayHistoryDto[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setUTCDate(day.getUTCDate() + i);
        if (day < monthStart || day > monthEnd) {
          continue;
        }
        const dayStart = startOfDayUTC(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const daySessions = sessions.filter(
          (s) => s.checkIn >= dayStart && s.checkIn <= dayEnd,
        );

        const dayTips = tips.filter(
          (t) => t.tipPool.date >= dayStart && t.tipPool.date <= dayEnd,
        );
        days.push({
          date: dayStart.toISOString().slice(0, 10),
          weekDay: dayStart.getUTCDay(),
          workedMinutes: daySessions.reduce(
            (acc, s) => acc + s.totalMinutes,
            0,
          ),
          extraMinutes: daySessions.reduce((acc, s) => acc + s.extraMinutes, 0),
          tips: dayTips.reduce((acc, t) => acc + t.amount, 0),
          sessions: daySessions.map((s) => ({
            sessionId: s.id,
            checkIn: s.checkIn,
            checkOut: s.checkOut,
            shift: s.shift,
          })),
        });
      }
      if (days.length > 0) {
        weeks.push({
          weekStart: weekStart.toISOString().slice(0, 10),
          weekEnd: weekEnd.toISOString().slice(0, 10),
          days,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return weeks;
  }
}

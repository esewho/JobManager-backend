import { Injectable } from '@nestjs/common';
import { WeeklyHistoryDto } from './Dto/weeklyHistory.dto';
import { WorkSessionStatus } from '@prisma/client';
import { prisma } from 'src/prisma/prisma';
function startOfDay(date: Date): Date {
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
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0),
  );
}

@Injectable()
export class WeeklyHistoryService {

  async getWeeklyHistory(userId: string): Promise<WeeklyHistoryDto[]> {
    const now = new Date();

    // 🔑 CLAVE: mover la fecha base
    const weekStart = startOfWeek(now);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        status: WorkSessionStatus.CLOSED,
        checkIn: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: {
        checkIn: 'asc',
      },
    });
    const tips = await prisma.tipDistribution.findMany({
      where: {
        userId,
        tipPool: {
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      },
      include: {
        tipPool: true,
      },
    });
    const result: WeeklyHistoryDto[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setUTCDate(weekStart.getUTCDate() + i);
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const daySessions = sessions.filter(
        (s) => s.checkIn >= dayStart && s.checkIn <= dayEnd,
      );

      const dayTips = tips.filter(
        (t) => t.tipPool.date >= dayStart && t.tipPool.date <= dayEnd,
      );
      result.push({
        date: day.toISOString().slice(0, 10),
        weekDay: day.getUTCDay(),
        workedMinutes: daySessions.reduce((acc, s) => acc + s.totalMinutes, 0),
        extraMinutes: daySessions.reduce((acc, s) => acc + s.extraMinutes, 0),
        tips: dayTips.reduce((acc, t) => acc + Number(t.amount), 0),
        sessions: daySessions.map((s) => ({
          sessionId: s.id,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          shift: s.shift,
        })),
      });
    }
    return result;
  }
}

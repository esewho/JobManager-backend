import { Injectable } from '@nestjs/common';
import { WorkSessionStatus } from '@prisma/client';
import { prisma } from 'src/prisma/prisma';

@Injectable()
export class HistoryCalendarService {
  async getCalendarMonth(
    userId: string,
    workspaceId: string,
    month: number,
    year: number,
  ) {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        workspaceId,
        status: WorkSessionStatus.CLOSED,
        checkIn: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const days: any[] = [];

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const dayStart = new Date(Date.UTC(year, month - 1, i));
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const daySessions = sessions.filter(
        (s) => s.checkIn >= dayStart && s.checkIn <= dayEnd,
      );

      const workedMinutes = daySessions.reduce(
        (acc, s) => acc + s.totalMinutes,
        0,
      );

      const extraMinutes = daySessions.reduce(
        (acc, s) => acc + s.extraMinutes,
        0,
      );

      days.push({
        date: dayStart.toISOString().slice(0, 10),
        workedMinutes,
        extraMinutes,
        sessions: daySessions.length,
      });
    }

    return days;
  }

  async getDayDetail(userId: string, workspaceId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        workspaceId,
        checkIn: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: { pauses: true },
    });

    const pauses = sessions.flatMap((s) => s.pauses);

    return {
      date,
      workedMinutes: sessions.reduce((acc, s) => acc + s.totalMinutes, 0),
      extraMinutes: sessions.reduce((acc, s) => acc + s.extraMinutes, 0),
      sessions,
      pauses,
    };
  }
}

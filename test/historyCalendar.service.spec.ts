import { HistoryCalendarService } from 'src/HistoryCalendar/history-calendar.service';
import { prisma } from '../src/prisma/prisma';
import { WorkSessionStatus } from '@prisma/client';

jest.mock('../src/prisma/prisma', () => ({
  prisma: {
    workSession: {
      findMany: jest.fn(),
    },
  },
}));

describe('HistoryCalendarService', () => {
  let service: HistoryCalendarService;

  beforeEach(() => {
    service = new HistoryCalendarService();
    jest.clearAllMocks();
  });

  describe('getCalendarMonth', () => {
    it('should return calendar with aggregated data per day', async () => {
      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([
        {
          checkIn: new Date('2026-01-10T10:00:00Z'),
          totalMinutes: 120,
          extraMinutes: 30,
          status: WorkSessionStatus.CLOSED,
        },
        {
          checkIn: new Date('2026-01-10T12:00:00Z'),
          totalMinutes: 60,
          extraMinutes: 10,
          status: WorkSessionStatus.CLOSED,
        },
      ]);

      const result = await service.getCalendarMonth(
        'user-1',
        'workspace-1',
        1,
        2026,
      );

      expect(prisma.workSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          status: WorkSessionStatus.CLOSED,
          checkIn: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
      });

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            workedMinutes: expect.any(Number),
            extraMinutes: expect.any(Number),
            sessions: expect.any(Number),
          }),
        ]),
      );

      const day10 = result.find((d) => d.date === '2026-01-10');
      expect(day10).toBeDefined();
      expect(day10!.workedMinutes).toBe(180);
      expect(day10!.extraMinutes).toBe(40);
      expect(day10!.sessions).toBe(2);
    });
  });

  describe('getDayDetail', () => {
    it('should return day detail with sessions and pauses', async () => {
      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([
        {
          totalMinutes: 100,
          extraMinutes: 20,
          pauses: [{ startTime: new Date(), endTime: new Date() }],
        },
        {
          totalMinutes: 50,
          extraMinutes: 10,
          pauses: [],
        },
      ]);

      const result = await service.getDayDetail(
        'user-1',
        'workspace-1',
        '2026-01-10',
      );

      expect(prisma.workSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          checkIn: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: {
          pauses: true,
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          date: '2026-01-10',
          workedMinutes: 150,
          extraMinutes: 30,
          sessions: expect.any(Array),
          pauses: expect.any(Array),
        }),
      );
    });

    it('should return empty arrays when no sessions', async () => {
      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDayDetail(
        'user-1',
        'workspace-1',
        '2026-01-10',
      );

      expect(result.sessions).toEqual([]);
      expect(result.pauses).toEqual([]);
      expect(result.workedMinutes).toBe(0);
      expect(result.extraMinutes).toBe(0);
    });
  });
});

import { prisma } from 'src/prisma/prisma';
import { WorkSessionsService } from 'src/app/work-sessions/work-sessions.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkSessionStatus } from '@prisma/client';

jest.mock('src/prisma/prisma', () => ({
  prisma: {
    userWorkspace: {
      findUnique: jest.fn(),
    },
    workSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    workPause: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('WorkSessionsService', () => {
  let service: WorkSessionsService;

  beforeEach(() => {
    service = new WorkSessionsService();
    jest.clearAllMocks();
  });
  describe('checkIn', () => {
    it('should create a work session for the user in the workspace', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
      });
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue(null);

      (prisma.workSession.create as jest.Mock).mockResolvedValue({
        id: 'session-1',
        checkIn: new Date(),
        totalMinutes: 0,
        extraMinutes: 0,
        status: 'OPEN',
        shift: null,
      });

      const result = await service.checkIn('user-1', 'workspace-1');

      expect(prisma.workSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          checkIn: expect.any(Date),
          totalMinutes: 0,
          extraMinutes: 0,
          status: 'OPEN',
        },
      });
      expect(result.status).toBe('OPEN');
    });
    it('should throw if user is not in workspace', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.checkIn('user-1', 'workspace-1')).rejects.toThrow(
        NotFoundException,
      );
    });
    it('should throw if user already has an open session in the workspace', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-1',
      });
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        checkIn: new Date(),
        totalMinutes: 0,
        extraMinutes: 0,
        status: 'OPEN',
        shift: null,
      });
      await expect(service.checkIn('user-1', 'workspace-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
  describe('checkOut', () => {
    it('should close the session of the user and return the updated session', async () => {
      const now = new Date();
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        checkIn: new Date(now.getTime() - 8 * 60 * 60 * 1000), // 8 hours ago
        status: 'OPEN',
        pauses: [],
      });
      (prisma.workSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-1',
        checkIn: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        pauses: [],
      });
      (prisma.workPause.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.workSession.update as jest.Mock).mockResolvedValue({
        id: 'session-1',
        checkIn: new Date(now.getTime() - 8 * 60 * 60 * 1000),
        checkOut: now,
        totalMinutes: 480,
        extraMinutes: 0,
        status: 'CLOSED',
        shift: null,
      });
      const result = await service.checkOut('user-1', 'workspace-1');

      expect(prisma.workSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          status: 'OPEN',
        },
        include: {
          pauses: true,
        },
      });
      expect(prisma.workSession.update).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'session-1',
        checkIn: expect.any(Date),
        checkOut: expect.any(Date),
        totalMinutes: 480,
        extraMinutes: 0,
        status: 'CLOSED',
        shift: null,
      });
    });
    it('should pause the session of the user and return isPaused true', async () => {
      const now = new Date();

      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        checkIn: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        checkOut: null,
        status: 'OPEN',
        pauses: [],
      });

      (prisma.workPause.create as jest.Mock).mockResolvedValue({
        id: 'pause-1',
        sessionId: 'session-1',
        startTime: now,
        endTime: null,
      });

      (prisma.workSession.update as jest.Mock).mockResolvedValue({
        id: 'session-1',
        status: 'PAUSED',
      });

      const result = await service.pauseSession('user-1', 'workspace-1');

      expect(prisma.workSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          checkOut: null,
        },
        include: {
          pauses: true,
        },
      });

      expect(prisma.workPause.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          startTime: expect.any(Date),
        },
      });

      expect(prisma.workSession.update).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
        },
        data: {
          status: 'PAUSED',
        },
      });

      expect(result).toEqual({
        isPaused: true,
      });
    });
    it('should throw if user has no open session in the workspace', async () => {
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.checkOut('user-1', 'workspace-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getSessionsbyUser', () => {
    it('should throw if userId is not provided', async () => {
      await expect(service.getSessionsByUser('')).rejects.toThrow(
        BadRequestException,
      );
    });
    it('should return all sessions of the user', async () => {
      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'session-1',
          userId: 'user-1',
          workspaceId: 'workspace-1',
          checkIn: new Date(),
          checkOut: null,
          totalMinutes: 0,
          extraMinutes: 0,
          status: 'OPEN',
          shift: null,
          pauses: [],
        },
        {
          id: 'session-2',
          userId: 'user-1',
          workspaceId: 'workspace-2',
          checkIn: new Date(),
          checkOut: null,
          totalMinutes: 0,
          extraMinutes: 0,
          status: 'OPEN',
          shift: null,
          pauses: [{ id: 'pause-1', endTime: null }],
        },
      ]);
      const result = await service.getSessionsByUser('user-1');

      expect(prisma.workSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        include: {
          pauses: true,
        },
        orderBy: {
          checkIn: 'desc',
        },
      });

      expect(result).toEqual([
        {
          id: 'session-1',
          checkIn: expect.any(Date),
          checkOut: undefined,
          isPaused: false,
          totalMinutes: 0,
          extraMinutes: 0,
          status: 'OPEN',
          shift: null,
        },
        {
          id: 'session-2',
          checkIn: expect.any(Date),
          checkOut: undefined,
          isPaused: true,
          totalMinutes: 0,
          extraMinutes: 0,
          status: 'OPEN',
          shift: null,
        },
      ]);
    });
  });

  describe('getMySessions', () => {
    it('should throw if user is not in workspace', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getMySessions('user-1', 'workspace-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return he summary of the user', async () => {
      (prisma.workSession.aggregate as jest.Mock)
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: 480,
            extraMinutes: 60,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: 2400,
            extraMinutes: 300,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: 9600,
            extraMinutes: 300,
          },
        });
      const result = await service.getMySummary('user-1', 'workspace-1');

      expect(prisma.workSession.aggregate).toHaveBeenCalledTimes(3);

      expect(result).toEqual({
        today: {
          date: expect.any(Date),
          workedMinutes: 480,
          extraMinutes: 60,
        },
        thisWeek: {
          date: expect.any(Date),
          workedMinutes: 2400,
          extraMinutes: 300,
        },
        thisMonth: {
          date: expect.any(Date),
          workedMinutes: 9600,
          extraMinutes: 300,
        },
      });
    });
  });

  describe('getTodaySession', () => {
    it('should return the today session of the user', async () => {
      const now = new Date();

      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        checkIn: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        checkOut: null,
        pauses: [],
        totalMinutes: 120,
        extraMinutes: 0,
        status: WorkSessionStatus.OPEN,
        shift: null,
      });
      const result = await service.getTodaySession('user-1', 'workspace-1');

      expect(prisma.workSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          status: WorkSessionStatus.OPEN,
        },
        include: {
          pauses: true,
        },
        orderBy: {
          checkIn: 'desc',
        },
      });
      expect(result).toEqual({
        checkIn: expect.any(Date),
        checkOut: null,
        isPaused: false,
        totalMinutes: 120,
        extraMinutes: 0,
        status: WorkSessionStatus.OPEN,
        shift: null,
      });
    });
    it('should return default values if user has no session today', async () => {
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getTodaySession('user-1', 'workspace-1');

      expect(result).toEqual({
        checkIn: null,
        checkOut: null,
        isPaused: false,
        totalMinutes: 0,
        extraMinutes: 0,
        status: WorkSessionStatus.CLOSED,
        shift: null,
      });
    });
    it('should return paused session correctly', async () => {
      const now = new Date();

      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        checkIn: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        checkOut: null,
        pauses: [{ id: 'pause-1', starTime: now, endTime: null }],
        totalMinutes: 120,
        extraMinutes: 0,
        status: WorkSessionStatus.PAUSED,
        shift: null,
      });
      const result = await service.getTodaySession('user-1', 'workspace-1');

      expect(result?.isPaused).toBe(true);
      expect(result?.status).toBe(WorkSessionStatus.PAUSED);
    });
  });

  describe('pauseSession', () => {
    it('should throw if no session active', async () => {
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.pauseSession('user-1', 'workspace-1'),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.workSession.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          checkOut: null,
        },
        include: {
          pauses: true,
        },
      });
    });

    it('should pause the session of the user in workspace', async () => {
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        checkOut: null,
        pauses: [],
      });
      (prisma.workPause.create as jest.Mock).mockResolvedValue({
        id: 'pause-1',
        sessionId: 'session-1',
        startTime: new Date(),
        endTime: null,
      });
      (prisma.workSession.update as jest.Mock).mockResolvedValue({
        id: 'session-1',
        status: 'PAUSED',
      });
      const result = await service.pauseSession('user-1', 'workspace-1');

      expect(prisma.workPause.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-1',
          startTime: expect.any(Date),
        },
      });
      expect(prisma.workSession.update).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
        },
        data: {
          status: 'PAUSED',
        },
      });
      expect(result).toEqual({ isPaused: true });
    });
    it('should resume the paused session', async () => {
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        checkOut: null,
        pauses: [
          {
            id: 'pause-1',
            startTime: new Date(),
            endTime: null,
          },
        ],
      });
      (prisma.workPause.update as jest.Mock).mockResolvedValue({
        id: 'pause-1',
        endTime: new Date(),
      });
      (prisma.workSession.update as jest.Mock).mockResolvedValue({
        id: 'session-1',
        status: 'OPEN',
      });
      const result = await service.pauseSession('user-1', 'workspace-1');

      expect(prisma.workPause.update).toHaveBeenCalledWith({
        where: {
          id: 'pause-1',
        },
        data: {
          endTime: expect.any(Date),
        },
      });
      expect(prisma.workSession.update).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
        },
        data: {
          status: 'OPEN',
        },
      });
      expect(result).toEqual({
        isPaused: false,
      });
    });
  });

  describe('getMySummary', () => {
    it('should return today, week and month summary of the user', async () => {
      (prisma.workSession.aggregate as jest.Mock)
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: 480,
            extraMinutes: 60,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: 2400,
            extraMinutes: 120,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: 9600,
            extraMinutes: 600,
          },
        });

      const result = await service.getMySummary('user-1', 'workspace-1');

      expect(prisma.workSession.aggregate).toHaveBeenCalledTimes(3);

      expect(prisma.workSession.aggregate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            workspaceId: 'workspace-1',
            status: WorkSessionStatus.CLOSED,
          }),
        }),
      );

      expect(prisma.workSession.aggregate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            workspaceId: 'workspace-1',
            status: WorkSessionStatus.CLOSED,
          }),
        }),
      );

      expect(prisma.workSession.aggregate).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            workspaceId: 'workspace-1',
            status: WorkSessionStatus.CLOSED,
          }),
        }),
      );

      expect(result).toEqual({
        today: {
          date: expect.any(Date),
          workedMinutes: 480,
          extraMinutes: 60,
        },
        thisWeek: {
          date: expect.any(Date),
          workedMinutes: 2400,
          extraMinutes: 120,
        },
        thisMonth: {
          date: expect.any(Date),
          workedMinutes: 9600,
          extraMinutes: 600,
        },
      });
    });

    it('should return 0 values when aggregates are null', async () => {
      (prisma.workSession.aggregate as jest.Mock)
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: null,
            extraMinutes: null,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: null,
            extraMinutes: null,
          },
        })
        .mockResolvedValueOnce({
          _sum: {
            totalMinutes: null,
            extraMinutes: null,
          },
        });

      const result = await service.getMySummary('user-1', 'workspace-1');

      expect(result).toEqual({
        today: {
          date: expect.any(Date),
          workedMinutes: 0,
          extraMinutes: 0,
        },
        thisWeek: {
          date: expect.any(Date),
          workedMinutes: 0,
          extraMinutes: 0,
        },
        thisMonth: {
          date: expect.any(Date),
          workedMinutes: 0,
          extraMinutes: 0,
        },
      });
    });
  });

  describe('getMyHistory', () => {
    it('should return grouped history for today', async () => {
      const today = new Date();

      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'session-1',
          checkIn: today,
          checkOut: null,
          shift: null,
          totalMinutes: 480,
          extraMinutes: 60,
          status: WorkSessionStatus.CLOSED,
        },
        {
          id: 'session-2',
          checkIn: today,
          checkOut: null,
          shift: null,
          totalMinutes: 120,
          extraMinutes: 0,
          status: WorkSessionStatus.CLOSED,
        },
      ]);

      const result = await service.getMyHistory('user-1', 'today');

      expect(prisma.workSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: WorkSessionStatus.CLOSED,
          checkIn: {
            gte: expect.any(Date),
          },
        },
      });

      expect(result).toEqual([
        {
          checkIn: expect.any(Date),
          checkOut: null,
          id: 'session-1',
          shift: null,
          date: expect.any(Date),
          totalMinutes: 600,
          extraMinutes: 60,
        },
      ]);
    });

    it('should return an empty array if no history exists', async () => {
      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getMyHistory('user-1', 'today');

      expect(result).toEqual([]);
    });

    it('should throw if period is invalid', async () => {
      await expect(
        service.getMyHistory('user-1', 'invalid' as 'today'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should group sessions from different days separately', async () => {
      const today = new Date();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      (prisma.workSession.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'session-1',
          checkIn: today,
          checkOut: null,
          shift: null,
          totalMinutes: 480,
          extraMinutes: 60,
          status: WorkSessionStatus.CLOSED,
        },
        {
          id: 'session-2',
          checkIn: yesterday,
          checkOut: null,
          shift: null,
          totalMinutes: 300,
          extraMinutes: 30,
          status: WorkSessionStatus.CLOSED,
        },
      ]);

      const result = await service.getMyHistory('user-1', 'week');

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual(
        expect.objectContaining({
          totalMinutes: expect.any(Number),
          extraMinutes: expect.any(Number),
        }),
      );

      expect(result[1]).toEqual(
        expect.objectContaining({
          totalMinutes: expect.any(Number),
          extraMinutes: expect.any(Number),
        }),
      );
    });
  });
});

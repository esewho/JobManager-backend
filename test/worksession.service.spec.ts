import { prisma } from 'src/prisma/prisma';
import { WorkSessionsService } from 'src/app/work-sessions/work-sessions.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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
    });
  });
});

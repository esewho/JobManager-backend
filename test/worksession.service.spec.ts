import { prisma } from 'src/prisma/prisma';
import { WorkSessionsService } from 'src/app/work-sessions/work-sessions.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('src/prisma/prisma', () => ({
  prisma: {
    userWorkspace: {
      findUnique: jest.fn(),
    },
    workSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
  });
});

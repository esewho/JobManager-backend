import { WorkSchedulesService } from '../src/app/work-schedules/work-schedules.service';
import { prisma } from '../src/prisma/prisma';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('../src/prisma/prisma', () => ({
  prisma: {
    workSchedule: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    userWorkspace: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('WorkSchedulesService', () => {
  let service: WorkSchedulesService;

  beforeEach(() => {
    service = new WorkSchedulesService();

    jest.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should throw if no user founded in workspace', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSchedule(
          {
            userId: 'user-1',
            date: '2024-12-01',
            startTime: '09:00',
            endTime: '17:00',
          },
          'workspace-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if schedule overlaps with existing schedule', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'uw-1',
      });
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: 'schedule-1',
      });

      await expect(
        service.createSchedule(
          {
            userId: 'user-1',
            date: '2024-12-01',
            startTime: '09:00',
            endTime: '17:00',
          },
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if end time is before start time', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'uw-1',
      });

      await expect(
        service.createSchedule(
          {
            userId: 'user-1',
            date: '2024-12-01',
            startTime: '17:00',
            endTime: '09:00',
          },
          'workspace-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a schedule successfully', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'uw-1',
      });
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.workSchedule.create as jest.Mock).mockResolvedValue({
        id: 'schedule-1',
      });

      const result = await service.createSchedule(
        {
          userId: 'user-1',
          date: '2027-12-01',
          startTime: '09:00',
          endTime: '17:00',
        },
        'workspace-1',
      );

      expect(prisma.workSchedule.create).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'schedule-1',
      });
    });
  });

  describe('updateScheduleStatus');
});

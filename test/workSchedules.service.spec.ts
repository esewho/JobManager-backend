import { WorkSchedulesService } from '../src/app/work-schedules/work-schedules.service';
import { prisma } from '../src/prisma/prisma';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ScheduleStatus } from '@prisma/client';

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

  describe('updateScheduleStatus', () => {
    it('it should throw if schedule not found', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateScheduleStatus(
          'user-1',
          'workspace-1',
          'schedule-1',
          ScheduleStatus.ACCEPTED,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.workSchedule.findFirst as jest.Mock).toHaveBeenCalledWith({
        where: {
          id: 'schedule-1',
          userWorkspace: {
            userId: 'user-1',
            workspaceId: 'workspace-1',
          },
        },
      });
    });
    it('should throw if schedule is already processed', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: 'schedule-1',
        status: ScheduleStatus.ACCEPTED,
      });
      await expect(
        service.updateScheduleStatus(
          'user-1',
          'workspace-1',
          'schedule-1',
          ScheduleStatus.REJECTED,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update scheduleStatus correctly', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue({
        id: 'schedule-1',
        status: ScheduleStatus.PENDING,
      });
      (prisma.workSchedule.update as jest.Mock).mockResolvedValue({
        id: 'schedule-1',
        status: ScheduleStatus.ACCEPTED,
      });
      const result = await service.updateScheduleStatus(
        'user-1',
        'workspace-1',
        'schedule-1',
        ScheduleStatus.ACCEPTED,
      );

      expect(prisma.workSchedule.update as jest.Mock).toHaveBeenCalledWith({
        where: {
          id: 'schedule-1',
        },
        data: {
          status: ScheduleStatus.ACCEPTED,
        },
      });
      expect(result).toEqual({ message: 'Schedule updated successfully' });
    });
  });

  describe('update schedule data', () => {
    const schedule = {
      id: 'schedule-1',
      date: new Date('2026-06-05'),
      startTime: new Date('2026-06-25T08:00:00'),
      endTime: new Date('2026-06-25T16:00:00'),
    };

    it('should throw if schedule does not exists', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.updateSchedule('schedule-1', 'workspace-1', {
          date: '2026-06-05',
          startTime: '9:00',
          endTime: '17:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });
    it('should throw if date is missing', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(schedule);

      await expect(
        service.updateSchedule('schedule-1', 'workspace-1', {
          startTime: '9:00',
          endTime: '17:00',
        }),
      ).rejects.toThrow('No date');
    });
    it('should throw if startTime is missing', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(schedule);

      await expect(
        service.updateSchedule('schedule-1', 'workspace-1', {
          date: '2026-06-25',
          endTime: '17:00',
        }),
      ).rejects.toThrow('No startTime defined');
    });
    it('should throw if endTime is missing', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(schedule);

      await expect(
        service.updateSchedule('schedule-1', 'workspace-1', {
          date: '2026-06-25',
          startTime: '17:00',
        }),
      ).rejects.toThrow('No endTime defined');
    });
    it('should throw if endTime is before starTime', async () => {
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(schedule);

      await expect(
        service.updateSchedule('schedule-1', 'workspace-1', {
          date: '2026-06-25',
          startTime: '17:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow('End time must be after start time');
    });
    it('should update schedule successfully', async () => {
      const updatedSchedule = {
        id: 'schedule-1',
        date: new Date('2026-06-25'),
        startTime: new Date('2026-06-25T09:00:00'),
        endTime: new Date('2026-06-25T17:00:00'),
      };
      (prisma.workSchedule.findFirst as jest.Mock).mockResolvedValue(schedule);
      (prisma.workSchedule.update as jest.Mock).mockResolvedValue(
        updatedSchedule,
      );
      const result = await service.updateSchedule('schedule-1', 'workspace-1', {
        date: '2026-06-05',
        startTime: '09:00',
        endTime: '17:00',
      });

      expect(prisma.workSchedule.update as jest.Mock).toHaveBeenCalledWith({
        where: {
          id: 'schedule-1',
        },
        data: {
          date: new Date('2026-06-05'),
          startTime: expect.any(Date),
          endTime: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedSchedule);
    });
  });

  describe('deleteSchedule', () => {
    it('should throw if schedule is not found or not allowed', async () => {
      (prisma.workSchedule.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });
      await expect(
        service.deleteSchedule('schedule-1', 'workspace-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.workSchedule.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'schedule-1',
          userWorkspace: {
            workspaceId: 'workspace-1',
          },
        },
      });
    });
    it('should delete schedule succesfully', async () => {
      (prisma.workSchedule.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });
      const result = await service.deleteSchedule('schedule-1', 'workspace-1');

      expect(prisma.workSchedule.deleteMany as jest.Mock).toHaveBeenCalledWith({
        where: {
          id: 'schedule-1',
          userWorkspace: {
            workspaceId: 'workspace-1',
          },
        },
      });
      expect(result).toEqual({ message: 'Schedule deleted successfully' });
    });
  });

  describe('getSchedulesOfWorkspace', () => {
    it('should return all schedules of workspace', async () => {
      const schedules = [
        {
          id: 'schedule-1',
          date: new Date(),
          userWorkspace: {
            user: {
              id: 'user-1',
              username: 'John',
              avatarUrl: 'avatar.png',
            },
          },
        },
      ];
      (prisma.workSchedule.findMany as jest.Mock).mockResolvedValue(schedules);
      const result = await service.getSchedulesOfWorkspace('workspace-1');

      expect(prisma.workSchedule.findMany).toHaveBeenCalledWith({
        where: {
          userWorkspace: {
            workspaceId: 'workspace-1',
          },
        },
        include: {
          userWorkspace: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      });
      expect(result).toEqual(schedules);
    });
  });
});

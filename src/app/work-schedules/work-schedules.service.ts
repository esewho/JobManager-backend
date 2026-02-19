import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from 'src/prisma/prisma';
import { CreateScheduleDto } from './Dto/createSchedule.dto';
import { UpdateScheduleDto } from './Dto/UpdateSchedule.dto';
import { ScheduleStatus } from '@prisma/client';

function combineDateAndTime(date: string, time: string): Date {
  if (!date) {
    throw new ForbiddenException('No date to format');
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes);
}

@Injectable()
export class WorkSchedulesService {
  async createSchedule(dto: CreateScheduleDto, workspaceId: string) {
    const userWorkspace = await prisma.userWorkspace.findUnique({
      where: { id: dto.userWorkspaceId, workspaceId },
    });

    if (!userWorkspace) {
      throw new NotFoundException('User does not belong to this workspace');
    }

    const start = combineDateAndTime(dto.date, dto.startTime);
    const end = combineDateAndTime(dto.date, dto.endTime);
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    if (start < new Date()) {
      throw new BadRequestException('Cannot create schedule in the past');
    }

    const overlapping = await prisma.workSchedule.findFirst({
      where: {
        userWorkspaceId: userWorkspace.id,
        date: new Date(dto.date),
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Schedule overlaps with another shift');
    }

    return prisma.workSchedule.create({
      data: {
        userWorkspaceId: dto.userWorkspaceId,
        date: new Date(dto.date),
        startTime: start,
        endTime: end,
      },
    });
  }

  async updateSchedule(
    scheduleId: string,
    workspaceId: string,
    dto: UpdateScheduleDto,
  ) {
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: scheduleId, userWorkspace: { workspaceId } },
    });
    if (!schedule) {
      throw new NotFoundException('Schedule not found in this workspace');
    }
    if (!dto.date) {
      throw new ForbiddenException('No date');
    }
    if (!dto.startTime) {
      throw new ForbiddenException('No startTime defined');
    }
    if (!dto.endTime) {
      throw new ForbiddenException('No endTime defined');
    }
    const date = dto.date ?? schedule.date.toISOString().split('T')[0];

    const start = dto.startTime
      ? combineDateAndTime(date, dto.startTime)
      : schedule.startTime;

    const end = dto.endTime
      ? combineDateAndTime(date, dto.endTime)
      : schedule.endTime;

    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }
    return await prisma.workSchedule.update({
      where: { id: scheduleId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        startTime: start ? new Date(start) : undefined,
        endTime: end ? new Date(end) : undefined,
      },
    });
  }

  async deleteSchedule(scheduleId: string, workspaceId: string) {
    const result = await prisma.workSchedule.deleteMany({
      where: {
        id: scheduleId,
        userWorkspace: {
          workspaceId,
        },
      },
    });
    if (result.count === 0) {
      throw new ForbiddenException('Schedule not found or not allowed');
    }
    return { message: 'Schedule deleted successfully' };
  }

  async getSchedulesOfWorkspace(workspaceId: string) {
    return prisma.workSchedule.findMany({
      where: {
        userWorkspace: {
          workspaceId,
        },
      },
      include: {
        userWorkspace: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async getMySchedules(userId: string, workspaceId: string) {
    return prisma.workSchedule.findMany({
      where: {
        userWorkspace: {
          userId,
          workspaceId,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async updateScheduleStatus(
    userId: string,
    workspaceId: string,
    scheduleId: string,
    status: ScheduleStatus,
  ) {
    const schedule = await prisma.workSchedule.findFirst({
      where: {
        id: scheduleId,
        userWorkspace: {
          userId,
          workspaceId,
        },
      },
    });
    if (!schedule) {
      throw new ForbiddenException('You cannot modify this schedule');
    }
    return prisma.workSchedule.update({
      where: { id: scheduleId },
      data: { status },
    });
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from 'src/prisma/prisma';
import { CreateScheduleDto } from './Dto/createSchedule.dto';
import { UpdateScheduleDto } from './Dto/UpdateSchedule.dto';
import { ScheduleStatus } from '@prisma/client';

@Injectable()
export class WorkSchedulesService {
  async createSchedule(dto: CreateScheduleDto, workspaceId: string) {
    const userWorkspace = await prisma.userWorkspace.findUnique({
      where: { id: dto.userWorkspaceId, workspaceId },
    });

    if (!userWorkspace) {
      throw new NotFoundException('User does not belong to this workspace');
    }
    return prisma.workSchedule.create({
      data: {
        userWorkspaceId: dto.userWorkspaceId,
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
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
    return await prisma.workSchedule.update({
      where: { id: scheduleId },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
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

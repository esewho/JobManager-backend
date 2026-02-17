import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, WorkSessionStatus, WorkShift } from '@prisma/client';
import { prisma } from '../../prisma/prisma';
import { CreateUserDto } from './Dto/createUser.dto';
import * as bcrypt from 'bcrypt';
import { UserDto } from 'src/user/Dto/user-dto';

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
@Injectable()
export class AdminService {
  async setActiveOrDeactivateUser(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { active: isActive },
    });
    return {
      message: `User has been ${isActive ? 'activated' : 'deactivated'}`,
    };
  }

  async getAllWorkspaceUsers(workspaceId: string) {
    return await prisma.userWorkspace.findMany({
      where: { workspaceId },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            username: true,
            session: {
              where: {
                workspaceId,
              },
              orderBy: {
                checkIn: 'desc',
              },
              take: 1,
              select: {
                status: true,
                checkIn: true,
                checkOut: true,
                totalMinutes: true,
              },
            },
          },
        },
      },
    });
  }

  async updateWorkSessionShift(sessionId: string, shift: WorkShift) {
    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Work session not found');
    }
    if (session.status !== WorkSessionStatus.CLOSED) {
      throw new BadRequestException('Only closed sessions can be updated');
    }

    if (session.shift) {
      throw new BadRequestException('Shift has already been assigned');
    }

    const { start, end } = getDayRange(session.checkIn);

    const existingSameShift = await prisma.workSession.findFirst({
      where: {
        userId: session.userId,
        shift,
        checkIn: { gte: start, lte: end },
      },
    });
    if (existingSameShift) {
      throw new BadRequestException(
        `User already has a ${shift} shift for this day`,
      );
    }
    return await prisma.workSession.update({
      where: { id: sessionId },
      data: { shift },
    });
  }

  async getAllWorkSessions(workspaceId: string) {
    return prisma.workSession.findMany({
      where: {
        workspaceId,
        user: {
          workspaces: {
            some: { workspaceId },
          },
        },
      },
      select: {
        id: true,
        date: true,
        status: true,
        checkIn: true,
        checkOut: true,
        totalMinutes: true,
        extraMinutes: true,

        user: {
          select: {
            id: true,
            username: true,
            workspaces: {
              where: { workspaceId },
              select: {
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async getAllTipsPools() {
    return await prisma.tipPool.findMany({
      select: {
        distributions: true,
        date: true,
        shift: true,
        totalAmount: true,
      },
    });
  }

  async createEmployee(
    dto: CreateUserDto,
    workspaceId: string,
    adminUserId: string,
  ) {
    const isAdminInWorkspace = await prisma.userWorkspace.findFirst({
      where: {
        userId: adminUserId,
        workspaceId: workspaceId,
        role: Role.ADMIN,
      },
    });
    if (!isAdminInWorkspace || isAdminInWorkspace.role !== Role.ADMIN) {
      throw new BadRequestException(
        'Only admins can create employees in this workspace',
      );
    }
    const existingUser = await prisma.userWorkspace.findFirst({
      where: {
        user: {
          username: dto.username,
        },
        workspaceId: workspaceId,
      },
    });
    if (existingUser) {
      throw new BadRequestException('User already exists in this workspace');
    }

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
    if (!workspace) {
      throw new BadRequestException('Workspace does not exist');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: dto.role,
        active: dto.active,
      },
    });
    await prisma.userWorkspace.create({
      data: {
        userId: user.id,
        workspaceId: workspaceId,
        role: dto.role,
      },
    });
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    } as UserDto;
  }

  async getAllUsersOfWorkspaceToManage(workspaceId: string) {
    const users = await prisma.userWorkspace.findMany({
      where: { workspaceId },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            username: true,
            active: true,
          },
        },
      },
      orderBy: {
        user: {
          username: 'asc',
        },
      },
    });

    return users.map((u) => ({
      id: u.user.id,
      username: u.user.username,
      active: u.user.active,
      role: u.role,
    }));
  }
}

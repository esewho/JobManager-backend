import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkSessionStatus, WorkShift } from '@prisma/client';
import { prisma } from '../../prisma/prisma';

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

  async getWorkingUsers() {
    const sessions = await prisma.workSession.findMany({
      where: { status: WorkSessionStatus.OPEN },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
    return sessions.map((session) => ({
      userId: session.user.id,
      username: session.user.username,
      checkIn: session.checkIn,
      role: session.user.role,
    }));
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

  async getAllWorkSessions() {
    return await prisma.workSession.findMany({
      select: {
        id: true,
        userId: true,
        checkIn: true,
        checkOut: true,
        status: true,
        shift: true,
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
    const isAdminInWorkspace = await this.prisma.userWorkspace.findFirst({
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
    const existingUser = await this.prisma.userWorkspace.findFirst({
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

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
    if (!workspace) {
      throw new BadRequestException('Workspace does not exist');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: dto.role,
        active: dto.active,
      },
    });
    await this.prisma.userWorkspace.create({
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
}

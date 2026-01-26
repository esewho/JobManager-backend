import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WorkspaceDto } from './Dto/workspace.dto';
import { Role } from '@prisma/client';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkspace(dto: WorkspaceDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    console.log(user);
    if (user?.role !== Role.ADMIN) {
      throw new Error('Only admins can create workspaces');
    }

    const existingWorkspace = await this.prisma.workspace.findFirst({
      where: {
        name: dto.name,
      },
    });
    if (existingWorkspace) {
      throw new Error('Workspace already exists');
    }
    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        imageUrl: dto.imageUrl,
      },
    });
    await this.prisma.userWorkspace.create({
      data: {
        userId: userId,
        workspaceId: workspace.id,
        role: Role.ADMIN,
      },
    });
    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    dto: WorkspaceDto,
    userId: string,
  ) {
    const userWorkspace = await this.prisma.userWorkspace.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });
    if (userWorkspace?.role !== Role.ADMIN) {
      throw new Error('Only admins can update workspaces');
    }

    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
    if (!existingWorkspace) {
      throw new NotFoundException('Workspace not found');
    }
    const workspace = await this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.imageUrl && { imageUrl: dto.imageUrl }),
      },
    });
    return workspace;
  }

  async getAllWorkspaces(userId: string) {
    const userWorkspace = await this.prisma.userWorkspace.findMany({
      where: {
        userId,
      },
      include: { workspace: true },
    });
    if (userWorkspace.length === 0) {
      throw new NotFoundException('No workspaces found for this user');
    }
    return userWorkspace.map((uw) => uw.workspace);
  }

  async deleteWorkspace(workspaceId: string, userId: string) {
    const userWorkspace = await this.prisma.userWorkspace.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });
    if (userWorkspace?.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete workspaces');
    }

    const existingWorkspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
    if (!existingWorkspace) {
      throw new NotFoundException('Workspace not found');
    }

    await this.prisma.workspace.delete({
      where: {
        id: workspaceId,
      },
    });
    return { message: 'Workspace deleted successfully' };
  }
}

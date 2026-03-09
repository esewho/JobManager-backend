import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { WorkspaceDto } from './Dto/workspace.dto';
import { Role } from '@prisma/client';
import { prisma } from 'src/prisma/prisma';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class WorkspaceService {
  async createWorkspace(
    dto: WorkspaceDto,
    userId: string,
    file: Express.Multer.File,
  ) {
    const uploadPath = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const sanitizedOriginalName = file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}_${sanitizedOriginalName}`;
    const imageUrl: string | undefined = `/uploads/${filename}`;

    fs.writeFileSync(path.join(uploadPath, filename), file.buffer);

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    console.log(user);
    if (user?.role !== Role.ADMIN) {
      throw new Error('Only admins can create workspaces');
    }

    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        name: dto.name,
      },
    });
    if (existingWorkspace) {
      throw new Error('Workspace already exists');
    }
    const workspace = await prisma.workspace.create({
      data: {
        name: dto.name,
        imageUrl,
      },
    });
    await prisma.userWorkspace.create({
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
    file?: Express.Multer.File,
  ) {
    const userWorkspace = await prisma.userWorkspace.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });
    if (userWorkspace?.role !== Role.ADMIN) {
      throw new Error('Only admins can update workspaces');
    }

    const existingWorkspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });

    let newImageUrl = existingWorkspace?.imageUrl;
    if (file) {
      const uploadPath = path.join(process.cwd(), 'uploads');

      const sanitizedName = file.originalname.replace(/\s+/g, '_');
      const filename = `${Date.now()}_${sanitizedName}`;

      const filePath = path.join(uploadPath, filename);

      await fs.promises.writeFile(filePath, file.buffer);

      newImageUrl = `/uploads/${filename}`;

      if (existingWorkspace?.imageUrl) {
        const oldPath = path.join(process.cwd(), existingWorkspace.imageUrl);

        try {
          await fs.promises.unlink(oldPath);
        } catch (error) {
          console.warn('Old image not found');
        }
      }
    }

    if (!existingWorkspace) {
      throw new NotFoundException('Workspace not found');
    }
    const workspace = await prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        ...(dto?.name && { name: dto.name }),
        ...(newImageUrl && { imageUrl: newImageUrl }),
      },
    });
    return workspace;
  }

  async getAllWorkspaces(userId: string) {
    const workspace = await prisma.workspace.findMany({
      where: {
        users: { some: { userId } },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    });

    if (workspace.length === 0) {
      throw new NotFoundException('No workspaces found for this user');
    }
    return workspace;
  }

  async getWorkspaceById(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async deleteWorkspace(workspaceId: string, userId: string) {
    const userWorkspace = await prisma.userWorkspace.findFirst({
      where: {
        userId,
        workspaceId,
      },
    });
    if (userWorkspace?.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete workspaces');
    }

    const existingWorkspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
    if (!existingWorkspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (existingWorkspace.imageUrl) {
      const filePath = path.join(process.cwd(), existingWorkspace.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.workspace.delete({
      where: {
        id: workspaceId,
      },
    });
    return { message: 'Workspace deleted successfully' };
  }
}

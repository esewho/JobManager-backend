import { WorkspaceService } from 'src/app/Workspace/workspace.service';
import { prisma } from 'src/prisma/prisma';
import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

jest.mock('/src/prisma/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    workspace: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userWorkspace: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(() => {
    service = new WorkspaceService();
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    const dto = { name: 'Workspace Test' };

    const file = {
      originalname: 'logo.png',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;
    it('should throw if user is not admin role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        role: Role.EMPLOYEE,
      });
      await expect(
        service.createWorkspace(dto, 'user-1', file),
      ).rejects.toThrow('Only admins can create workspaces');
    });

    it('should throw if workspace already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        role: Role.ADMIN,
      });
      (prisma.workspace.findFirst as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
      });
      await expect(
        service.createWorkspace(dto, 'user-1', file),
      ).rejects.toThrow('Workspace already exists');
    });
    it('should create workspace succesfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        role: Role.ADMIN,
      });
      (prisma.workspace.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.workspace.create as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
        name: 'Workspace Test',
        imageUrl: '/uploads/test.png',
      });
      (prisma.userWorkspace.create as jest.Mock).mockResolvedValue({
        id: 'uw-1',
      });
      const result = await service.createWorkspace(dto, 'user-1', file);

      expect(prisma.workspace.create).toHaveBeenCalled();

      expect(prisma.userWorkspace.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          role: Role.ADMIN,
        },
      });

      expect(result).toEqual({
        id: 'workspace-1',
        name: 'Workspace Test',
        imageUrl: '/uploads/test.png',
      });
    });
  });

  describe('updateWorkspace', () => {
    const dto = { name: 'Workspace Test Updated' };

    const file = {
      originalname: 'logo.png',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    it('should throw if user is not admin role', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock).mockResolvedValue({
        role: Role.EMPLOYEE,
      });

      await expect(
        service.updateWorkspace('workspace-1', dto, 'user-1', file),
      ).rejects.toThrow('Only admins can update workspaces');
    });

    it('should update workspace successfully', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock).mockResolvedValue({
        role: Role.ADMIN,
      });

      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
        name: 'Old Workspace',
        imageUrl: null,
      });

      (prisma.workspace.update as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
        name: 'Workspace Test Updated',
        imageUrl: '/uploads/new.png',
      });

      const result = await service.updateWorkspace(
        'workspace-1',
        dto,
        'user-1',
        file,
      );

      expect(prisma.workspace.update).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'workspace-1',
        name: 'Workspace Test Updated',
        imageUrl: '/uploads/new.png',
      });
    });
  });

  describe('getAllWorkspaces', () => {
    it('should throw if no workspaces found for user', async () => {
      (prisma.workspace.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.getAllWorkspaces('user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: {
          users: {
            some: {
              userId: 'user-1',
            },
          },
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
      });
    });

    it('should return all workspaces of the user', async () => {
      const workspaces = [
        {
          id: 'workspace-1',
          name: 'Workspace 1',
          imageUrl: '/uploads/test.png',
          createdAt: new Date(),
          _count: {
            users: 5,
          },
        },
      ];
      (prisma.workspace.findMany as jest.Mock).mockResolvedValue(workspaces);

      const result = await service.getAllWorkspaces('user-1');

      expect(result).toEqual(workspaces);
    });
  });

  describe('getWorkspaceById', () => {
    it('should throw if workspace not found', async () => {
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getWorkspaceById('workspace-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: 'workspace-1' },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      });
    });
    it('should return a workspace by id', async () => {
      const workspace = {
        id: 'workspace-1',
        name: 'Workspacpe 1',
        imageuRL: '/uplodas/test.png',
        createdAt: new Date(),
        _count: {
          users: 5,
        },
      };
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(workspace);

      const result = await service.getWorkspaceById('workspace-1');

      expect(result).toEqual(workspace);
    });
  });

  describe('deleteWorkspace', () => {
    it('should throw if user is not admin role', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock).mockResolvedValue({
        role: Role.EMPLOYEE,
      });

      await expect(
        service.deleteWorkspace('workspace-1', 'user-1'),
      ).rejects.toThrow('Only admins can delete workspaces');

      expect(prisma.userWorkspace.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
        },
      });
    });

    it('should throw if workspace is not found', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock).mockResolvedValue({
        role: Role.ADMIN,
      });

      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteWorkspace('workspace-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete workspace successfully', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock).mockResolvedValue({
        role: Role.ADMIN,
      });

      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
        name: 'Workspace 1',
        imageUrl: null,
        createdAt: new Date(),
      });

      (prisma.workspace.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteWorkspace('workspace-1', 'user-1');

      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: {
          id: 'workspace-1',
        },
      });

      expect(result).toEqual({
        message: 'Workspace deleted successfully',
      });
    });
  });
});

import { prisma } from '../src/prisma/prisma';
import { AdminService } from '../src/app/admin/admin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, WorkSessionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('/src/prisma/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    userWorkspace: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
    },
  },
}));

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    service = new AdminService();
    jest.clearAllMocks();
  });

  describe('setActiveOrDeactivateUser', () => {
    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setActiveOrDeactivateUser('user-1', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should activate user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const result = await service.setActiveOrDeactivateUser('user-1', true);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { active: true },
      });
      expect(result).toEqual({ message: 'User has been activated' });
    });
    it('should deactivate user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const result = await service.setActiveOrDeactivateUser('user-1', false);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { active: false },
      });
      expect(result).toEqual({ message: 'User has been deactivated' });
    });
  });

  describe('getAllWorkspaceUsers', () => {
    it('should throw if no workspaceId provided', async () => {
      await expect(service.getAllWorkspaceUsers('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return all users of workspace', async () => {
      const mockUsers = [
        {
          role: Role.EMPLOYEE,
          user: {
            id: 'user-1',
            username: 'testuser',
            email: 'test@test.com',
            session: [],
          },
        },
      ];
      (prisma.userWorkspace.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.getAllWorkspaceUsers('workspace-1');

      expect(result).toEqual(mockUsers);
    });
  });

  describe('getAllWorkSessions', () => {
    it('should return all the sessions of the workspace', async () => {
      const sessions = { id: 'session-1' };

      (prisma.workSession.findMany as jest.Mock).mockResolvedValue(sessions);

      const result = await service.getAllWorkSessions('workspace-1');

      expect(result).toEqual(sessions);
    });
  });

  describe('createEmployee', () => {
    it('should throw if creator is not admin', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createEmployee(
          {
            username: 'testuser',
            email: 'test@test.com',
            password: '12345',
            role: Role.EMPLOYEE,
            active: true,
          },
          'workspace-1',
          'admin-1',
        ),
      ).rejects.toThrow('Only admins can create employees in this workspace');
    });

    it('should throw if employee already exists', async () => {
      (prisma.userWorkspace.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          role: Role.ADMIN,
        })
        .mockResolvedValueOnce({ id: 'existing-user' });
      await expect(
        service.createEmployee(
          {
            username: 'test',
            email: 'test@test.com',
            password: '12345',
            role: Role.EMPLOYEE,
            active: true,
          },
          'workspace-1',
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if workspace does not exist', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          role: Role.ADMIN,
        })
        .mockResolvedValueOnce(null);

      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createEmployee(
          {
            username: 'test',
            email: 'test@testcom',
            password: '12345',
            role: Role.EMPLOYEE,
            active: true,
          },
          'workspace-1',
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create employee successfully', async () => {
      (prisma.userWorkspace.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          role: Role.ADMIN,
        })
        .mockResolvedValueOnce(null);

      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        username: 'employee',
        role: Role.EMPLOYEE,
        active: true,
        createdAt: new Date(),
      });

      const result = await service.createEmployee(
        {
          username: 'employee',
          email: 'employee@test.com',
          password: '123456',
          role: Role.EMPLOYEE,
          active: true,
        },
        'workspace-1',
        'admin-1',
      );

      expect(prisma.userWorkspace.create).toHaveBeenCalled();

      expect(result.id).toBe('user-1');
    });
  });

  describe('getAllUsersOfWorkspaceToManage', () => {
    it('should map users correctly', async () => {
      (prisma.userWorkspace.findMany as jest.Mock).mockResolvedValue([
        {
          role: Role.EMPLOYEE,
          user: {
            id: 'user-1',
            username: 'test',
            email: 'test@test.com',
            active: true,
            avatarUrl: null,
          },
        },
      ]);
      const result =
        await service.getAllUsersOfWorkspaceToManage('workspace-1');

      expect(result).toEqual([
        {
          id: 'user-1',
          username: 'test',
          email: 'test@test.com',
          active: true,
          role: Role.EMPLOYEE,
          avatarUrl: null,
        },
      ]);
    });
  });

  describe('getCurrentSession', () => {
    it('should throw if session not found', async () => {
      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCurrentSession('user-1', 'workspace-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return calculated session data', async () => {
      const checkIn = new Date(Date.now() - 60 * 60 * 1000);

      (prisma.workSession.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        status: WorkSessionStatus.OPEN,
        checkIn,
        checkOut: null,
        pauses: [],
        user: {
          id: 'user-1',
          username: 'test',
        },
      });
      const result = await service.getCurrentSession('user-1', 'workspace-1');
      expect(result.isActive).toBe(true);
      expect(result.totalMinutes).toBeGreaterThan(50);
      expect(result.workedMinutes).toBeGreaterThan(50);
    });
  });
});

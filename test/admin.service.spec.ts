import { prisma } from '../src/prisma/prisma';
import { AdminService } from '../src/app/admin/admin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

jest.mock('/src/prisma/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
  });
});

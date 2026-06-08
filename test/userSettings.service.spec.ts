import * as bcrypt from 'bcrypt';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from 'src/prisma/prisma';
import { SettingsService } from '../src/app/userSettings/settings.service';
import { Role } from '@prisma/client';

jest.mock('src/prisma/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('changeUserNameService', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService();

    jest.clearAllMocks();
  });

  describe('changeUserName', () => {
    it('throw if username already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-2',
        username: 'existingUser',
      });
      await expect(
        service.changeUserName('existingUser', 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update username successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        username: 'newUsername',
        role: Role.EMPLOYEE,
        active: true,
        updatedAt: new Date(),
      });
      const result = await service.changeUserName('newUsername', 'user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
        },
        data: {
          username: 'newUsername',
        },
        select: {
          id: true,
          username: true,
          role: true,
          active: true,
          updatedAt: true,
        },
      });
      expect(result.username).toBe('newUsername');
    });
  });

  describe('changeUserPassword', () => {
    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.changeUserPassword(
          {
            username: 'user-1',
            currentPassword: 'currentPass',
            newPassword: 'newPass',
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
    it('should throw if current password is incorrect', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changeUserPassword(
          {
            username: 'user-1',
            currentPassword: 'wrongPass',
            newPassword: 'newPass',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
    it('should throw if new password is too short', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changeUserPassword(
          {
            username: 'user-1',
            currentPassword: 'currentPass',
            newPassword: '123',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
    it('should update password successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        password: 'hashedPassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        username: 'lolaso',
        role: Role.EMPLOYEE,
        active: true,
        updatedAt: new Date(),
      });
      const result = await service.changeUserPassword(
        {
          username: 'lolaso',
          currentPassword: 'currentPass',
          newPassword: 'newPass',
        },
        'user-1',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
        },
        data: {
          password: 'newHashedPassword',
        },
        select: {
          id: true,
          username: true,
          role: true,
          active: true,
          updatedAt: true,
        },
      });
      expect(result.id).toBe('user-1');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from 'src/app/auth/auth.service';
import { prisma } from 'src/prisma/prisma';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

jest.mock('src/prisma/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    workspace: {
      findFirst: jest.fn(),
    },
    userWorkspace: {
      create: jest.fn(),
    },
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  const jwtServiceMock = {
    signAsync: jest.fn().mockReturnValue('fake-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return an accessToken', async () => {
      const dto = {
        email: 'test@gmail.com',
        username: 'testuser',
        password: 'password123',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.userWorkspace.create as jest.Mock).mockResolvedValue({
        id: 'uw-1',
      });
      (prisma.workspace.findFirst as jest.Mock).mockResolvedValue({
        id: 'workspace-1',
      });

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '123',
        email: dto.email,
        username: dto.username,
        role: 'USER',
      });

      const result = await service.register({
        email: dto.email,
        username: dto.username,
        password: dto.password,
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: dto.email }, { username: dto.username }],
        },
        select: { id: true },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          username: dto.username,
          password: 'hashed-password',
          role: Role.EMPLOYEE,
          active: true,
        },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      expect(jwtServiceMock.signAsync).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
      });
    });

    it('should throw if user already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '123',
        email: 'test@gmail.com',
      });

      await expect(
        service.register({
          email: 'test@gmail.com',
          username: 'testuser',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it("should throw if user doesn't exist", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'test@gmail.com',
          username: 'testuser',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if password is incorrect', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '123',
        email: 'test@gmail.com',
        username: 'testuser',
        password: 'hashed-password',
        role: 'EMPLOYEE',
        active: true,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@gmail.com',
          username: 'testuser',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return accessToken on successful login', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: '123',
        email: 'test@gmail.com',
        username: 'testuser',
        password: 'hashed-password',
        role: 'EMPLOYEE',
        active: true,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@gmail.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@gmail.com' }, { username: 'testuser' }],
        },
        select: {
          id: true,
          username: true,
          role: true,
          password: true,
          active: true,
        },
      });

      expect(jwtServiceMock.signAsync).toHaveBeenCalled();

      expect(result).toEqual({
        accessToken: 'fake-jwt-token',
      });
    });
  });

  describe('registerAdmin', () => {
    it('should throw if there is already an admin', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.registerAdmin({
          email: 'admin@gmail.com',
          username: 'adminuser',
          password: 'password123',
        }),
      ).rejects.toThrow('Admin registration is restricted');

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          role: Role.ADMIN,
        },
      });
    });

    it('should throw if user already exists', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-1',
      });

      await expect(
        service.registerAdmin({
          email: 'admin@gmail.com',
          username: 'adminuser',
          password: 'password123',
        }),
      ).rejects.toThrow('User already exists');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'admin@gmail.com' }, { username: 'adminuser' }],
        },
        select: {
          id: true,
        },
      });
    });

    it('should register admin successfully', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'admin-1',
        username: 'adminuser',
        email: 'admin@gmail.com',
        role: Role.ADMIN,
        createdAt: new Date(),
      });

      jest.spyOn(service as any, 'signToken').mockResolvedValue('jwt-token');

      const result = await service.registerAdmin({
        email: 'admin@gmail.com',
        username: 'adminuser',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'adminuser',
          email: 'admin@gmail.com',
          password: expect.any(String),
          role: Role.ADMIN,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      expect(result).toEqual({
        accessToken: 'jwt-token',
        user: {
          id: 'admin-1',
          username: 'adminuser',
          email: 'admin@gmail.com',
          role: Role.ADMIN,
          createdAt: expect.any(Date),
        },
      });
    });
  });
});

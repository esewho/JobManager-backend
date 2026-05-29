import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { InvitationService } from 'src/app/token-invitations/invitation.service';
import { JwtService } from '@nestjs/jwt';
import { prisma } from 'src/prisma/prisma';
import { Role } from '@prisma/client';

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({}),
    },
  })),
}));

jest.mock('src/prisma/prisma', () => ({
  prisma: {
    workspaceInvitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },

    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },

    userWorkspace: {
      create: jest.fn(),
    },
  },
}));

describe('InvitationService', () => {
  let service: InvitationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);

    jest.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should throw if email is missing', async () => {
      await expect(
        service.createInvitation('', 'workspace-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invitation already exists', async () => {
      (prisma.workspaceInvitation.findFirst as jest.Mock).mockResolvedValue({
        id: '123',
      });

      await expect(
        service.createInvitation('test@gmail.com', 'workspace-id'),
      ).rejects.toThrow(
        'Invitation already exists for this email and workspace',
      );
    });

    it('should create invitation successfully', async () => {
      (prisma.workspaceInvitation.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.workspaceInvitation.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@gmail.com',
      });

      const result = await service.createInvitation(
        'test@gmail.com',
        'workspace-id',
      );

      expect(prisma.workspaceInvitation.create).toHaveBeenCalled();

      expect(result).toEqual({
        id: '1',
        email: 'test@gmail.com',
      });
    });
  });

  describe('getInvitationByToken', () => {
    it('should throw if token does not exist', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.getInvitationByToken('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return invitation', async () => {
      const invitation = {
        token: 'abc',
        accepted: false,
        expiresAt: new Date(Date.now() + 10000),
      };

      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(
        invitation,
      );

      const result = await service.getInvitationByToken('abc');

      expect(result).toEqual(invitation);
    });
  });

  describe('deleteInvitation', () => {
    it('should throw if invitation not found', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.deleteInvitation('123')).rejects.toThrow(
        NotFoundException,
      );
    });
    it('should delete invitation', async () => {
      (prisma.workspaceInvitation.findUnique as jest.Mock).mockResolvedValue({
        id: '123',
      });

      (prisma.workspaceInvitation.delete as jest.Mock).mockResolvedValue({});

      const result = await service.deleteInvitation('123');

      expect(prisma.workspaceInvitation.delete).toHaveBeenCalledWith({
        where: {
          id: '123',
        },
      });

      expect(result).toEqual({
        message: 'Invitation deleted successfully',
      });
    });
  });

  describe('listAllInvitations', () => {
    it('should throw if workspaceId is missing', async () => {
      await expect(service.listAllInvitations('')).rejects.toThrow(
        BadRequestException,
      );
    });
    it('should return empty array if no invitations found', async () => {
      (prisma.workspaceInvitation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.listAllInvitations('workspace-id');

      expect(result).toEqual([]);
    });

    it('should return list of invitations', async () => {
      const invitations = [
        {
          id: '1',
          email: 'test@gmail.com',
          role: Role.EMPLOYEE,
          expiresAt: new Date(Date.now() + 10000),
          accepted: false,
        },
      ];

      (prisma.workspaceInvitation.findMany as jest.Mock).mockResolvedValue(
        invitations,
      );

      const result = await service.listAllInvitations('workspace-id');

      expect(result).toEqual(invitations);
    });
  });

  describe('acceptInvitation', () => {
    it('should throw if invitation not found', async () => {
      jest
        .spyOn(service as any, 'getInvitationByToken')
        .mockRejectedValue(new NotFoundException('Invitation not found'));

      await expect(
        service.acceptInvitation('invalid-token', {
          email: 'test@gmail.com',
          username: 'testuser',
          password: 'hashed-password',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(service['getInvitationByToken']).toHaveBeenCalledWith(
        'invalid-token',
      );
    });

    it('should throw if email does not match invitation', async () => {
      jest.spyOn(service as any, 'getInvitationByToken').mockResolvedValue({
        id: 'inv-1',
        email: 'invite@gmail.com',
        workspaceId: 'workspace-1',
        role: Role.EMPLOYEE,
      });

      await expect(
        service.acceptInvitation('token-123', {
          email: 'different@gmail.com',
          username: 'testuser',
          password: 'hashed-password',
        }),
      ).rejects.toThrow('Email does not match invitation');
    });

    it('should throw if user already exists', async () => {
      jest.spyOn(service as any, 'getInvitationByToken').mockResolvedValue({
        id: 'inv-1',
        email: 'invite@gmail.com',
        workspaceId: 'workspace-1',
        role: Role.EMPLOYEE,
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-1',
      });

      await expect(
        service.acceptInvitation('token-123', {
          email: 'invite@gmail.com',
          username: 'existinguser',
          password: 'hashed-password',
        }),
      ).rejects.toThrow('User with this email or username already exists');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'invite@gmail.com' }, { username: 'existinguser' }],
        },
      });
    });

    it('should accept invitation successfully', async () => {
      jest.spyOn(service as any, 'getInvitationByToken').mockResolvedValue({
        id: 'inv-1',
        email: 'invite@gmail.com',
        workspaceId: 'workspace-1',
        role: Role.EMPLOYEE,
      });

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'invite@gmail.com',
        username: 'newuser',
        role: Role.EMPLOYEE,
      });

      (prisma.userWorkspace.create as jest.Mock).mockResolvedValue({
        id: 'uw-1',
      });

      (prisma.workspaceInvitation.update as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        accepted: true,
      });

      jest.spyOn(service['jwt'], 'sign').mockReturnValue('jwt-token');

      const result = await service.acceptInvitation('token-123', {
        email: 'invite@gmail.com',
        username: 'newuser',
        password: '123456',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'invite@gmail.com',
          username: 'newuser',
          password: expect.any(String),
          role: Role.EMPLOYEE,
          active: true,
        },
      });

      expect(prisma.userWorkspace.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          role: Role.EMPLOYEE,
        },
      });

      expect(prisma.workspaceInvitation.update).toHaveBeenCalledWith({
        where: {
          id: 'inv-1',
        },
        data: {
          accepted: true,
        },
      });

      expect(result).toEqual({
        message: 'Invitation accepted successfully',
        accessToken: 'jwt-token',
      });
    });
  });
});

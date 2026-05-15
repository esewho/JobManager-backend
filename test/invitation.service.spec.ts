// invitation.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { InvitationService } from 'src/app/token-invitations/invitation.service';
import { JwtService } from '@nestjs/jwt';
import { prisma } from 'src/prisma/prisma';

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
});

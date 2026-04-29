import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './authDto/register.dto';
import { LoginDto } from './authDto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../../prisma/prisma';

type SafeUser = {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }
    if (!dto.email) {
      throw new BadRequestException('You need to put your email to register');
    }
    const workspace = await prisma.workspace.findFirst({});
    if (!workspace) {
      throw new BadRequestException('No workspace available');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        role: Role.EMPLOYEE,
        active: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    await prisma.userWorkspace.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: Role.EMPLOYEE,
      },
    });

    return {
      accessToken: await this.signToken({
        sub: user.id,
        role: user.role,
        workspaceId: workspace.id,
      }),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
      select: {
        id: true,
        username: true,
        role: true,
        password: true,
        active: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.active) {
      throw new BadRequestException('User account is deactivated');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new BadRequestException('Invalid credentials');
    }

    return {
      accessToken: await this.signToken({
        sub: user.id,
        role: user.role,
      }),
    };
  }

  async registerAdmin(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    const adminCount = await prisma.user.count({
      where: { role: Role.ADMIN },
    });

    if (adminCount > 0) {
      throw new BadRequestException('Admin registration is restricted');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
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

    return {
      accessToken: await this.signToken({
        sub: user.id,
        role: user.role,
      }),
      user,
    };
  }

  private async signToken(payload: {
    sub: string;
    role: Role;
    workspaceId?: string;
  }): Promise<string> {
    return this.jwt.signAsync(payload);
  }
}

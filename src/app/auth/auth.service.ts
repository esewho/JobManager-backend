import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './authDto/register.dto';
import { LoginDto } from './authDto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

type SafeUser = {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwt: JwtService,
  ) {}
  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const workspace = await this.prisma.workspace.findFirst({});
    if (!workspace) {
      throw new BadRequestException('No workspace available');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: Role.EMPLOYEE,
        active: true,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        active: true,
      },
    });

    await this.prisma.userWorkspace.create({
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
        username: dto.username,
        workspaceId: workspace.id,
      }),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const userWithPassword = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
      select: {
        id: true,
        username: true,
        role: true,
        password: true,
        createdAt: true,
        active: true,
      },
    });
    if (!userWithPassword) {
      throw new BadRequestException('Invalid credentials');
    }
    if (!userWithPassword.active) {
      throw new BadRequestException('User account is deactivated');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      userWithPassword.password,
    );
    if (!passwordMatches) {
      throw new BadRequestException('Invalid credentials');
    }
    const { password, ...safeUser } = userWithPassword;

    return {
      accessToken: await this.signToken({
        sub: safeUser.id,
        role: safeUser.role,
        username: safeUser.username,
      }),
    };
  }

  async registerAdmin(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    const adminCount = await this.prisma.user.count({
      where: {
        role: Role.ADMIN,
      },
    });
    if (adminCount > 0) {
      throw new BadRequestException('Admin registration is restricted');
    }
    const existingUser = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        role: Role.ADMIN,
      },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    return {
      accessToken: await this.signToken({
        sub: user.id,
        role: user.role,
        username: dto.username,
      }),
      user,
    };
  }

  private async signToken(payload: {
    sub: string;
    username: string;
    role: Role;
    workspaceId?: string;
  }): Promise<string> {
    return this.jwt.signAsync(payload);
  }
}

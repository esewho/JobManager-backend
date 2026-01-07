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
  async register(
    dto: RegisterDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
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
        role: Role.EMPLOYEE,
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

  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
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
      },
    });
    if (!userWithPassword) {
      throw new BadRequestException('Invalid credentials');
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
      user: safeUser,
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

  async logAdmin(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: SafeUser }> {
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
      },
    });
    if (!userWithPassword) {
      throw new BadRequestException('Invalid credentials');
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
      user: safeUser,
    };
  }

  private async signToken(payload: {
    sub: string;
    username: string;
    role: Role;
  }): Promise<string> {
    return this.jwt.signAsync(payload);
  }
}

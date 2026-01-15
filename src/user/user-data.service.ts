import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserDto } from './Dto/user-dto';

@Injectable()
export class UserDataService {
  constructor(private readonly prisma: PrismaService) {}
  async getUserData(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        active: true,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

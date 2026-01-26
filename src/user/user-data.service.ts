import { Injectable } from '@nestjs/common';
import { UserDto } from './Dto/user-dto';
import { prisma } from '../prisma/prisma';

@Injectable()
export class UserDataService {
  async getUserData(userId: string): Promise<UserDto> {
    const user = await prisma.user.findUnique({
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

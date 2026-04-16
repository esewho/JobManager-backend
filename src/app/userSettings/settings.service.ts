import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from 'src/prisma/prisma';
import { UserSettingsDto } from './Dto/userSettings.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SettingsService {
  async changeUserName(dto: UserSettingsDto, userId: string) {
    const existing = await prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new BadRequestException('Username already exists');
    }
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: { username: dto.username },
    });
  }
  async changeUserPassword(dto: UserSettingsDto, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, dto.newPassword);

    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.newPassword.length < 6) {
      throw new BadRequestException('Password is too short');
    }
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    return await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}

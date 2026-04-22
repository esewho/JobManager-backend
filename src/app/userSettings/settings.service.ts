import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from 'src/prisma/prisma';
import { UserSettingsDto } from './Dto/userSettings.dto';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

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
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });
  }
  async changeUserPassword(dto: UserSettingsDto, userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);

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
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });
  }

  async updateAvatarImage(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException('No image provided');
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const sanitizedName = file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}_${sanitizedName}`;

    const filePath = path.join(uploadPath, filename);

    fs.writeFileSync(filePath, file.buffer);

    const avatarUrl = `/uploads/${filename}`;

    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });
  }
}

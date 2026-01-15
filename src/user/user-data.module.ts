import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserDataService } from './user-data.service';
import { UserDataController } from './user-data.controller';

@Module({
  imports: [],
  controllers: [UserDataController],
  providers: [PrismaService, UserDataService],
})
export class UserDataModule {}

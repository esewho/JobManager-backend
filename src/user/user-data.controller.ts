import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/app/common/guards/jwt-auth.guard';
import { UserDto } from './Dto/user-dto';
import { UserDataService } from './user-data.service';
import { User } from 'src/app/common/decorators/user-id.decorator';

@Controller('user-data')
@UseGuards(JwtAuthGuard)
export class UserDataController {
  constructor(private readonly userDataService: UserDataService) {}
  @Get('/me')
  async getMyData(@User('userId') userId: string): Promise<UserDto> {
    return await this.userDataService.getUserData(userId);
  }
}

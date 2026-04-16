import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user-id.decorator';
import { UserSettingsDto } from './Dto/userSettings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}
  @Patch('change-username')
  async changeUserName(
    @Body() dto: UserSettingsDto,
    @User('userId') userId: string,
  ) {
    return await this.settingsService.changeUserName(dto, userId);
  }
  @Patch('change-user-password')
  async changePassword(
    @Body() dto: UserSettingsDto,
    @User('userId') userId: string,
  ) {
    return await this.settingsService.changeUserPassword(dto, userId);
  }
}

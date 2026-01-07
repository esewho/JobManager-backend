import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './authDto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Roles(Role.ADMIN)
  @Post('register-admin')
  async registerAdmin(@Body() dto: RegisterDto) {
    return await this.authService.registerAdmin(dto);
  }

  @Post('login')
  async login(@Body() dto: RegisterDto) {
    return await this.authService.login(dto);
  }
}

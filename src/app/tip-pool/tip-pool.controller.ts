import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TipPoolService } from './tip-pool.service';
import { TipPoolDto } from './Dto/tipPool.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('tip-pool')
export class TipPoolController {
  constructor(private readonly tipPoolService: TipPoolService) {}
  @Post('create')
  async createTipPool(@Body() dto: TipPoolDto) {
    return await this.tipPoolService.createTipPool(dto);
  }

  @Get('all')
  async getAllTipPools() {
    return await this.tipPoolService.getAllTipPools();
  }
}

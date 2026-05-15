import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '7d' },
    }),
  ],
})
export class InvitationModule {}

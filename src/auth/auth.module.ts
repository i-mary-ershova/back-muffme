import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartModule } from '../cart/cart.module';
import { BonusModule } from '../bonus/bonus.module';
import { UsersModule } from '../users/users.module';
import { jwtConstants } from './constants';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SmsService } from './services/sms.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    CartModule,
    BonusModule,
    UsersModule,
    ConfigModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, SmsService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
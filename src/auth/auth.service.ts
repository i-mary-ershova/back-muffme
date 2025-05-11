import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { addMinutes } from 'date-fns';
import { BonusService } from '../bonus/bonus.service';
import { UsersService } from '../users/users.service';
import { UserProfileDto } from '../users/dto/user-profile.dto';
import { LoginResponseDto } from './dto/auth.dto';
import { SmsService } from './services/sms.service';

@Injectable()
export class AuthService {
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cartService: CartService,
    private bonusService: BonusService,
    private usersService: UsersService,
    private smsService: SmsService,
  ) {}

  async requestVerificationCode(phoneNumber: string): Promise<{ message: string }> {
    // Generate a verification code
    const code = this.smsService.generateVerificationCode();
    
    // Store the code with 15-minute expiration
    await this.prisma.verificationCode.create({
      data: {
        phoneNumber,
        code,
        expiresAt: addMinutes(new Date(), 15),
      },
    });

    // Send the verification code via SMS
    const smsSent = await this.smsService.sendVerificationCode(phoneNumber, code);

    // In development mode or if SMS sending fails, return the code in the response
    if (this.isDevelopment || !smsSent) {
      return { 
        message: `Verification code is: ${code}. ${!smsSent ? 'Failed to send SMS.' : 'This code will always work in development.'}`
      };
    }

    return { 
      message: 'Verification code sent successfully'
    };
  }

  async verifyCode(phoneNumber: string, code: string): Promise<LoginResponseDto> {
    // Check if the code is valid
    const verificationCode = await this.prisma.verificationCode.findFirst({
      where: {
        phoneNumber,
        code,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verificationCode) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Mark the code as used
    await this.prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    const isNew = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: { phoneNumber },
      });
    }

    // Generate JWT token and get user profile
    const payload = { sub: user.id, phoneNumber: user.phoneNumber };
    const userProfile = await this.usersService.getUserProfile(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: userProfile,
      isNew,
    };
  }

  async calculateOrderBonus(userId: string, totalAmount: number, productId: string) {
    const earnedBonus = await this.bonusService.calculateOrderBonus(
      Number(userId),
      totalAmount,
      Number(productId)
    );
    return earnedBonus;
  }

  async spendBonusPoints(userId: string, bonusAmount: number, orderId: string) {
    const success = await this.bonusService.spendBonusPoints(
      Number(userId),
      bonusAmount,
      Number(orderId)
    );
    return success;
  }

  async validateUser(phoneNumber: string): Promise<any> {
    const user = await this.usersService.findByPhoneNumber(phoneNumber);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(phoneNumber: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(phoneNumber);
    const payload = { sub: user.id, phoneNumber: user.phoneNumber };
    const userProfile = await this.usersService.getUserProfile(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user: userProfile,
      isNew: false,
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: Number(payload.sub) },
      });
      return user;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async addToCart(userId: string, productId: string, quantity: number) {
    return this.cartService.addItem(Number(userId), Number(productId), quantity);
  }

  async updateCartItem(userId: string, productId: string, quantity: number) {
    return this.cartService.updateItemQuantity(Number(userId), Number(productId), quantity);
  }
} 
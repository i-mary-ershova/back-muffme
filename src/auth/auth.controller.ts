import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestCodeDto, VerifyCodeDto, LoginDto, LoginResponseDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Request verification code via SMS' })
  @ApiResponse({ 
    status: 200, 
    description: 'Verification code sent successfully via SMS',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Verification code sent successfully'
        }
      }
    }
  })
  @Post('request-code')
  async requestCode(@Body() requestCodeDto: RequestCodeDto) {
    return this.authService.requestVerificationCode(requestCodeDto.phoneNumber);
  }

  @ApiOperation({ summary: 'Verify SMS code and login' })
  @ApiResponse({ 
    status: 200, 
    description: 'Code verified and user logged in successfully',
    type: LoginResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid or expired verification code'
  })
  @Post('verify')
  async verify(@Body() verifyCodeDto: VerifyCodeDto): Promise<LoginResponseDto> {
    return this.authService.verifyCode(
      verifyCodeDto.phoneNumber,
      verifyCodeDto.code
    );
  }

  // @Post('login')
  // @HttpCode(200)
  // @ApiOperation({ summary: 'Login with phone number' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Returns access token and user profile',
  //   type: LoginResponseDto,
  // })
  // @ApiResponse({ status: 401, description: 'Invalid credentials' })
  // async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
  //   return this.authService.login(loginDto.phoneNumber);
  // }
} 
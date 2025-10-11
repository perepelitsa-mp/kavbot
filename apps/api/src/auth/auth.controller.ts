import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

class VerifyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  initData!: string;
}

class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lastName?: string;
}

class LoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram/verify')
  @ApiOperation({ summary: 'Verify Telegram WebApp init data and get JWT' })
  async verify(@Body() dto: VerifyDto) {
    return this.authService.verifyTelegramInitData(dto.initData);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user by phone' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.registerByPhone(
      dto.phone,
      dto.password,
      dto.firstName,
      dto.lastName,
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user by phone' })
  async login(@Body() dto: LoginDto) {
    console.log('[AuthController] Login attempt for phone:', dto.phone);
    const result = await this.authService.loginByPhone(dto.phone, dto.password);
    console.log('[AuthController] Login successful, token generated');
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: any) {
    console.log('[AuthController] /me called with user:', user);
    return this.authService.getUser(user.sub);
  }
}
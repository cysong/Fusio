import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Ip() ip: string, @Req() req: Request) {
    const forwardedFor = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
    const forwarded = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0];

    // 依次尝试常见代理头与 socket/框架取到的 IP
    const candidateIp =
      forwarded?.trim() ||
      (Array.isArray(ip) ? ip[0] : ip) ||
      req.headers['cf-connecting-ip']?.toString() ||
      req.headers['x-client-ip']?.toString() ||
      req.headers['fastly-client-ip']?.toString() ||
      req.socket.remoteAddress ||
      req.ip;

    return this.authService.login(loginDto, candidateIp || undefined);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      balanceUsdt: Number(user.balanceUsdt),
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
    };
  }
}

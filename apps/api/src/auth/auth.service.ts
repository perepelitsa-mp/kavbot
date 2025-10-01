import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@kavbot/database';
import { validateTelegramInitData } from '@kavbot/shared';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async verifyTelegramInitData(initData: string) {
    const botToken = process.env.BOT_TOKEN!;
    const isValid = validateTelegramInitData(initData, botToken, 120);

    if (!isValid) {
      throw new UnauthorizedException('Неверные данные инициализации Telegram');
    }

    // Parse initData
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    if (!userParam) {
      throw new UnauthorizedException('Данные пользователя не найдены');
    }

    const userData = JSON.parse(userParam);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { tgUserId: BigInt(userData.id) },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          tgUserId: BigInt(userData.id),
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
        },
      });
    } else {
      // Update user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
        },
      });
    }

    // Generate JWT
    const payload = { sub: user.id, tgUserId: user.tgUserId?.toString(), role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        tgUserId: user.tgUserId?.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      id: user.id,
      tgUserId: user.tgUserId?.toString(),
      phone: user.phone,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isBanned: user.isBanned,
    };
  }

  async registerByPhone(phone: string, password: string, firstName: string, lastName?: string) {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new BadRequestException('Пользователь с таким телефоном уже существует');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        firstName,
        lastName,
      },
    });

    // Generate JWT
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async loginByPhone(phone: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Неверный телефон или пароль');
    }

    // Check if banned
    if (user.isBanned) {
      throw new UnauthorizedException('Пользователь заблокирован');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный телефон или пароль');
    }

    // Generate JWT
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}

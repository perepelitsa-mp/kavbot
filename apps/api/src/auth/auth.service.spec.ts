import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@kavbot/database';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTelegramWebApp', () => {
    it('should throw UnauthorizedException for invalid data', async () => {
      const invalidInitData = 'invalid_data';

      await expect(
        service.validateTelegramWebApp(invalidInitData),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should validate correct initData and return user', async () => {
      const mockUser = {
        id: 'user-id',
        tgUserId: 12345n,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // Note: Real validation would require valid Telegram signature
      // For tests, we'd need to mock the HMAC validation
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      const userId = 'test-user-id';
      const expectedToken = 'mock-jwt-token';

      mockJwtService.sign.mockReturnValue(expectedToken);

      const result = service.generateToken(userId);

      expect(result).toEqual({ accessToken: expectedToken });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: userId },
        expect.objectContaining({ expiresIn: '30m' }),
      );
    });
  });
});

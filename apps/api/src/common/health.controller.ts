import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { prisma } from '@kavbot/database';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  async health() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  @Get('metrics')
  metrics() {
    // Placeholder for Prometheus metrics
    return {
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

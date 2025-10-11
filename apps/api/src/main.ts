import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

// BigInt serialization for JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Exception filters
  const { PrismaExceptionFilter } = await import('./common/filters/prisma-exception.filter');
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Kavbot API')
    .setDescription('API для Telegram-бота Кавалерово с RAG и WebApp')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);

  // Handle shutdown signals
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM signal received: closing HTTP server');
    await app.close();
    logger.log('HTTP server closed');
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT signal received: closing HTTP server');
    await app.close();
    logger.log('HTTP server closed');
  });
}

bootstrap();
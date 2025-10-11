import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error({
      code: exception.code,
      meta: exception.meta,
      message: exception.message,
    });

    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint violation',
          error: 'Conflict',
        });
        break;

      case 'P2025':
        // Record not found
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        });
        break;

      case 'P2003':
        // Foreign key constraint violation
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
          error: 'Bad Request',
        });
        break;

      default:
        // Other database errors
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
        });
    }
  }
}

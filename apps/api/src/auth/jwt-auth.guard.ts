import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    this.logger.debug(`Authorization header: ${authHeader?.substring(0, 30)}...`);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.debug({ err, user: user?.id, info }, 'JWT validation result');
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
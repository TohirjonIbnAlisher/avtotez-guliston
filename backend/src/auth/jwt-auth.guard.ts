import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  role: string;
  /** Faqat access token'lar qabul qilinadi (eski 7 kunlik tokenlarda bu maydon yo'q). */
  typ: 'access';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException("Avtorizatsiya talab qilinadi.");
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Token yaroqsiz yoki muddati o'tgan.");
    }
    if (payload.typ !== 'access') {
      throw new UnauthorizedException("Token yaroqsiz yoki muddati o'tgan.");
    }
    request.user = payload;
    return true;
  }
}

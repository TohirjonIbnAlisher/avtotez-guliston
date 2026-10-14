import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

export interface JwtPayload {
  sub: string;
  role: string;
  /** Faqat access token'lar qabul qilinadi (eski 7 kunlik tokenlarda bu maydon yo'q). */
  typ: 'access';
  /** Sessiya (refresh token oilasi) id'si — sessiya bekor qilinsa, access token ham darhol ishlamaydi. */
  sid?: string;
}

/** Sessiya holati shuncha vaqt keshlanadi — har so'rovda bazaga murojaat qilinmasligi uchun. */
const SESSION_CACHE_MS = 5_000;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly sessionCache = new Map<string, { revokedReason: string | null | undefined; at: number }>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken) private readonly tokensRepo: Repository<RefreshToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    if (payload.sid) {
      await this.assertSessionActive(payload.sid);
    }
    request.user = payload;
    return true;
  }

  /** Sessiya bekor qilingan bo'lsa (boshqa qurilmadan kirildi, chiqildi, parol o'zgardi) — 401. */
  private async assertSessionActive(sid: string): Promise<void> {
    const now = Date.now();
    let cached = this.sessionCache.get(sid);
    if (!cached || now - cached.at > SESSION_CACHE_MS) {
      // oilaning eng oxirgi tokeni: faol bo'lsa sessiya tirik
      const latest = await this.tokensRepo.findOne({
        where: { familyId: sid },
        order: { createdAt: 'DESC' },
        select: { id: true, revokedAt: true, revokedReason: true },
      });
      cached = { revokedReason: !latest ? 'missing' : latest.revokedAt ? (latest.revokedReason ?? 'revoked') : undefined, at: now };
      this.sessionCache.set(sid, cached);
      if (this.sessionCache.size > 10_000) {
        this.sessionCache.clear();
      }
    }
    if (cached.revokedReason === 'replaced') {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'SESSION_REPLACED',
        message: 'Hisobingizga boshqa qurilmadan kirildi.',
      });
    }
    if (cached.revokedReason) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'SESSION_REVOKED',
        message: 'Sessiya tugagan. Qayta kiring.',
      });
    }
  }
}

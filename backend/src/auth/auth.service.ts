import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { authSettings, AuthSettings } from './auth-settings';
import type { JwtPayload } from './jwt-auth.guard';

export interface PublicUser {
  id: string;
  phone: string;
  fullName: string | null;
  role: User['role'];
}

export interface AuthTokens {
  accessToken: string;
  /** Access token tugash vaqti (epoch ms) — frontend undan oldin yangilaydi. */
  accessTokenExpiresAt: number;
  refreshToken: string;
  /** Faolsizlik chegarasi — frontend shuncha vaqt harakatsizlikdan keyin chiqaradi. */
  idleTimeoutSeconds: number;
  user: PublicUser;
}

// Bir nechta tab bir vaqtda yangilasa, bittasi tokenni almashtirib ulguradi; qolganlariga
// shu muddat ichida "allaqachon almashtirilgan" deb javob beriladi (o'g'irlik deb hisoblanmaydi).
const ROTATION_GRACE_MS = 30_000;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;

function toPublicUser(user: User): PublicUser {
  return { id: user.id, phone: user.phone, fullName: user.fullName, role: user.role };
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function sessionError(code: string, message: string): UnauthorizedException {
  return new UnauthorizedException({ statusCode: 401, error: 'Unauthorized', code, message });
}

@Injectable()
export class AuthService {
  private readonly settings: AuthSettings;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken) private readonly tokensRepo: Repository<RefreshToken>,
    config: ConfigService,
  ) {
    this.settings = authSettings(config);
  }

  async login(phone: string, password: string, userAgent?: string): Promise<AuthTokens> {
    const user = await this.usersService.findByPhone(phone);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri.");
    }
    await this.cleanup(user.id);
    const now = Date.now();
    const refresh = await this.createRefreshToken(
      user.id,
      randomUUID(),
      new Date(now + this.settings.refreshTtlSeconds * 1000),
      userAgent,
    );
    return this.buildTokens(user, refresh.raw);
  }

  async refresh(rawToken: string, userAgent?: string): Promise<AuthTokens> {
    const token = await this.tokensRepo.findOne({ where: { tokenHash: hashToken(rawToken) } });
    if (!token) {
      throw sessionError('SESSION_INVALID', 'Sessiya topilmadi. Qayta kiring.');
    }

    const now = Date.now();
    if (token.revokedAt) {
      if (token.replacedById && now - token.revokedAt.getTime() < ROTATION_GRACE_MS) {
        throw sessionError('TOKEN_ROTATED', 'Token boshqa tabda yangilandi.');
      }
      // Bekor qilingan token qayta ishlatildi — o'g'irlangan bo'lishi mumkin: butun sessiya bekor qilinadi.
      await this.revokeFamily(token.familyId);
      throw sessionError('SESSION_REVOKED', 'Sessiya bekor qilindi. Qayta kiring.');
    }
    if (
      token.expiresAt.getTime() <= now ||
      now - token.lastUsedAt.getTime() > this.settings.idleTimeoutSeconds * 1000
    ) {
      await this.revokeFamily(token.familyId);
      throw sessionError('SESSION_EXPIRED', 'Faolsizlik sababli sessiya tugadi. Qayta kiring.');
    }

    const user = await this.usersService.findById(token.userId);
    if (!user) {
      await this.revokeFamily(token.familyId);
      throw sessionError('SESSION_INVALID', 'Foydalanuvchi topilmadi.');
    }

    const next = await this.createRefreshToken(user.id, token.familyId, token.expiresAt, userAgent);
    // Shartli yangilash: ikki so'rov bir vaqtda kelsa, faqat bittasi almashtira oladi.
    const result = await this.tokensRepo.update(
      { id: token.id, revokedAt: IsNull() },
      { revokedAt: new Date(now), replacedById: next.entity.id },
    );
    if (!result.affected) {
      await this.tokensRepo.delete({ id: next.entity.id });
      throw sessionError('TOKEN_ROTATED', 'Token boshqa tabda yangilandi.');
    }
    return this.buildTokens(user, next.raw);
  }

  async logout(rawToken: string): Promise<void> {
    const token = await this.tokensRepo.findOne({ where: { tokenHash: hashToken(rawToken) } });
    if (token) {
      await this.revokeFamily(token.familyId);
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }

  private buildTokens(user: User, refreshToken: string): AuthTokens {
    const payload: JwtPayload = { sub: user.id, role: user.role, typ: 'access' };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: this.settings.accessTtlSeconds }),
      accessTokenExpiresAt: Date.now() + this.settings.accessTtlSeconds * 1000,
      refreshToken,
      idleTimeoutSeconds: this.settings.idleTimeoutSeconds,
      user: toPublicUser(user),
    };
  }

  private async createRefreshToken(userId: string, familyId: string, expiresAt: Date, userAgent?: string) {
    const raw = randomBytes(48).toString('base64url');
    const entity = await this.tokensRepo.save(
      this.tokensRepo.create({
        userId,
        familyId,
        tokenHash: hashToken(raw),
        lastUsedAt: new Date(),
        expiresAt,
        revokedAt: null,
        replacedById: null,
        userAgent: userAgent?.slice(0, 300) ?? null,
      }),
    );
    return { raw, entity };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.tokensRepo.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  // Eskirgan va bekor qilingan tokenlarni vaqti-vaqti bilan tozalash (login paytida).
  private async cleanup(userId: string): Promise<void> {
    const before = new Date(Date.now() - CLEANUP_AFTER_MS);
    await this.tokensRepo.delete({ userId, expiresAt: LessThan(before) });
    await this.tokensRepo.delete({ userId, revokedAt: LessThan(before) });
  }
}

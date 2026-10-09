import { ConfigService } from '@nestjs/config';

export interface AuthSettings {
  /** Access token (JWT) amal qilish muddati, soniyada. */
  accessTtlSeconds: number;
  /** Refresh token mutlaq muddati, soniyada (faol bo'lsa ham shundan keyin qayta login kerak). */
  refreshTtlSeconds: number;
  /** Shuncha vaqt faolsizlikdan keyin sessiya tugaydi, soniyada. */
  idleTimeoutSeconds: number;
}

function positiveInt(config: ConfigService, key: string, fallback: number): number {
  const value = Number(config.get<string>(key));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function authSettings(config: ConfigService): AuthSettings {
  return {
    accessTtlSeconds: positiveInt(config, 'JWT_ACCESS_TTL_MINUTES', 15) * 60,
    refreshTtlSeconds: positiveInt(config, 'REFRESH_TOKEN_TTL_DAYS', 7) * 24 * 60 * 60,
    idleTimeoutSeconds: positiveInt(config, 'SESSION_IDLE_MINUTES', 30) * 60,
  };
}

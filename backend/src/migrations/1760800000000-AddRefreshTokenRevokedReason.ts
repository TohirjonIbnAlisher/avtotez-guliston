import { MigrationInterface, QueryRunner } from 'typeorm';

// Sessiya bekor qilinish sababi (bitta qurilma qoidasi: boshqa qurilmadan kirilganda — 'replaced').
export class AddRefreshTokenRevokedReason1760800000000 implements MigrationInterface {
  name = 'AddRefreshTokenRevokedReason1760800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "revoked_reason" character varying(20)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family" ON "refresh_tokens" ("family_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_family"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "revoked_reason"`);
  }
}

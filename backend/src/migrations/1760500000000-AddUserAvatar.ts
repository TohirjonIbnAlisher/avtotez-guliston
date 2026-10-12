import { MigrationInterface, QueryRunner } from 'typeorm';

// Foydalanuvchi profil rasmi. Development'da ustunni `synchronize` oldinroq qo'shadi — shuning uchun IF NOT EXISTS.
export class AddUserAvatar1760500000000 implements MigrationInterface {
  name = 'AddUserAvatar1760500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url"`);
  }
}

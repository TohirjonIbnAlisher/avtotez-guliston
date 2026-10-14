import { MigrationInterface, QueryRunner } from 'typeorm';

// Mavzu nomi/izohi/toifasining kirillcha va ruscha ko'rinishlari. Development'da ustunni `synchronize` oldinroq qo'shadi — shuning uchun IF NOT EXISTS.
export class AddTopicTranslations1760900000000 implements MigrationInterface {
  name = 'AddTopicTranslations1760900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "translations" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN IF EXISTS "translations"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

// Savolga izoh-video. Development'da ustunni `synchronize` oldinroq qo'shadi — shuning uchun IF NOT EXISTS.
export class AddQuestionVideoUrl1760400000000 implements MigrationInterface {
  name = 'AddQuestionVideoUrl1760400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "video_url" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN IF EXISTS "video_url"`);
  }
}

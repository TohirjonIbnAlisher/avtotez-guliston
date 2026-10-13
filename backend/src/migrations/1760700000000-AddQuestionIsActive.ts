import { MigrationInterface, QueryRunner } from 'typeorm';

// Savolni o'chirmasdan yashirish uchun belgi. Development'da ustunni `synchronize` oldinroq qo'shadi — shuning uchun IF NOT EXISTS.
export class AddQuestionIsActive1760700000000 implements MigrationInterface {
  name = 'AddQuestionIsActive1760700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN IF EXISTS "is_active"`);
  }
}

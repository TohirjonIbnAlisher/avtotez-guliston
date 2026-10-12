import { MigrationInterface, QueryRunner } from 'typeorm';

// Bilet ichidagi savollar tartibi. Development'da ustunni `synchronize` oldinroq qo'shadi — shuning uchun IF NOT EXISTS.
export class AddTicketQuestionOrder1760300000000 implements MigrationInterface {
  name = 'AddTicketQuestionOrder1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "question_order" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "question_order"`);
  }
}

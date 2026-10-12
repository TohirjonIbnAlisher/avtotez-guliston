import { MigrationInterface, QueryRunner } from 'typeorm';

// Mavzular katalogi (ptest.uz tartibi): bo'lim nomi va tartib raqami.
// Bu ustunlar development'da `synchronize` orqali qo'shilgan, production uchun migratsiya tushib qolgan edi.
export class AddTopicCategory1760600000000 implements MigrationInterface {
  name = 'AddTopicCategory1760600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "category" text`);
    await queryRunner.query(`ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN IF EXISTS "sortOrder"`);
    await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN IF EXISTS "category"`);
  }
}

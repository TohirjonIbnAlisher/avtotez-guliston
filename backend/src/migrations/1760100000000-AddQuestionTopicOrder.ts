import { MigrationInterface, QueryRunner } from 'typeorm';

// Savolning mavzu ichidagi tartib raqami. Development'da ustunni `synchronize` oldinroq qo'shadi,
// shuning uchun IF NOT EXISTS; mavjud savollar manba id bo'yicha 1, 2, 3, ... qilib raqamlanadi.
export class AddQuestionTopicOrder1760100000000 implements MigrationInterface {
  name = 'AddQuestionTopicOrder1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "topic_order" integer`);
    await queryRunner.query(
      `UPDATE "questions" q SET "topic_order" = s.rn
       FROM (
         SELECT "id", ROW_NUMBER() OVER (
           PARTITION BY "topic_id" ORDER BY "topic_order" ASC NULLS LAST, "source_id" ASC NULLS LAST, "id"
         ) AS rn
         FROM "questions" WHERE "topic_id" IS NOT NULL
       ) s
       WHERE q."id" = s."id" AND q."topic_order" IS DISTINCT FROM s.rn`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN IF EXISTS "topic_order"`);
  }
}

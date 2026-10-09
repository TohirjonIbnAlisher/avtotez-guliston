import { MigrationInterface, QueryRunner } from 'typeorm';

// Production'da `synchronize` o'chiq — progress jadvallari shu migration orqali yaratiladi.
// Development'da jadvallarni `synchronize` oldinroq yaratib qo'yadi, shuning uchun hammasi IF NOT EXISTS.
// Constraint nomlari TypeORM generatsiya qiladigan nomlar bilan bir xil.
export class CreateUserProgress1760000000000 implements MigrationInterface {
  name = 'CreateUserProgress1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_question_progress" (
        "user_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "status" character varying(10),
        "selected_option" integer,
        "is_saved" boolean NOT NULL DEFAULT false,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c1e2957078b24b6cb9b105e7795" PRIMARY KEY ("user_id", "question_id"),
        CONSTRAINT "FK_2416a23b6ff1568ee3f36da3289" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_db6297c0407cd60ddd33f9554bd" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "answer_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "is_correct" boolean NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_61816b7bb8ba52c8eed81f2be74" PRIMARY KEY ("id"),
        CONSTRAINT "FK_3e086e90bea28a35d58d5d8e42e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_2f4b2a0e22381ebe3341437f884" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_answer_events_user_created" ON "answer_events" ("user_id", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_ticket_results" (
        "user_id" uuid NOT NULL,
        "ticket_number" integer NOT NULL,
        "correct" integer NOT NULL,
        "wrong" integer NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_514ef51ee6414394b8f68371ff4" PRIMARY KEY ("user_id", "ticket_number"),
        CONSTRAINT "FK_29764cc116c5049d36b7e1c0449" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "test_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "correct" integer NOT NULL,
        "wrong" integer NOT NULL,
        "total" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e807cb96e1f86f25f5559360f27" PRIMARY KEY ("id"),
        CONSTRAINT "FK_91c0461040ab8006313df4f2ec0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_test_sessions_user_created" ON "test_sessions" ("user_id", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_activity_days" (
        "user_id" uuid NOT NULL,
        "day" date NOT NULL,
        CONSTRAINT "PK_355159101cd2503cdefbe299dc5" PRIMARY KEY ("user_id", "day"),
        CONSTRAINT "FK_af77c6fd3e81bd333e32bc7fbdc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_activity_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "test_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_ticket_results"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "answer_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_question_progress"`);
  }
}

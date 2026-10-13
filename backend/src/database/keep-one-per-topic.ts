import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

// Har bir mavzuda faqat bitta (tartib bo'yicha birinchi) savolni faol qoldiradi, qolganlari — jumladan
// mavzusiz (faqat biletlardagi) savollar — nofaol bo'ladi. Savollar o'chirilmaydi, faqat yashiriladi.
//
//   npm run questions:keep-one-per-topic              har mavzudan bittadan qoldirish
//   npm run questions:keep-one-per-topic -- --restore  barcha savollarni qayta faollashtirish

const RESTORE = process.argv.includes('--restore');

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const ds = app.get<DataSource>(getDataSourceToken());
    await ds.transaction(async (manager) => {
      if (RESTORE) {
        await manager.query(`UPDATE "questions" SET "is_active" = true WHERE "is_active" = false`);
      } else {
        await manager.query(`UPDATE "questions" SET "is_active" = false`);
        await manager.query(
          `UPDATE "questions" q SET "is_active" = true
           FROM (
             SELECT DISTINCT ON ("topic_id") "id" FROM "questions"
             WHERE "topic_id" IS NOT NULL
             ORDER BY "topic_id", "topic_order" NULLS LAST, "source_id" NULLS LAST
           ) first
           WHERE q."id" = first."id"`,
        );
      }
    });
    const [{ active, total }] = await ds.query(
      `SELECT COUNT(*) FILTER (WHERE "is_active") AS active, COUNT(*) AS total FROM "questions"`,
    );
    console.log(`Faol savollar: ${active} / ${total}`);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('Xato:', err);
  process.exit(1);
});

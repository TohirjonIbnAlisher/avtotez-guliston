import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

// Har bir mavzuda faqat bitta (tartib bo'yicha birinchi) savolni faol qoldiradi, qolganlari — jumladan
// mavzusiz (faqat biletlardagi) savollar — nofaol bo'ladi. Savollar o'chirilmaydi, faqat yashiriladi.
//
//   npm run questions:keep-one-per-topic                       har mavzudan bittadan qoldirish
//   npm run questions:keep-one-per-topic -- --restore          barcha savollarni qayta faollashtirish
//   npm run questions:keep-one-per-topic -- --activate-official
//       rasmiy bazadagi (data/questions/uz.json) savollarni faollashtiradi; hozir faol savollarga tegmaydi

const RESTORE = process.argv.includes('--restore');
const ACTIVATE_OFFICIAL = process.argv.includes('--activate-official');

function officialSourceIds(): number[] {
  const raw: { id: number }[] = JSON.parse(
    readFileSync(join(__dirname, '../../../data/questions/uz.json'), 'utf-8'),
  );
  return raw.map((q) => q.id);
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const ds = app.get<DataSource>(getDataSourceToken());
    await ds.transaction(async (manager) => {
      if (RESTORE) {
        await manager.query(`UPDATE "questions" SET "is_active" = true WHERE "is_active" = false`);
      } else if (ACTIVATE_OFFICIAL) {
        const ids = officialSourceIds();
        const [, changed]: [unknown, number] = await manager.query(
          `UPDATE "questions" SET "is_active" = true
           WHERE "is_active" = false AND "source_id" = ANY($1::int[])`,
          [ids],
        );
        const [{ found }] = await manager.query(
          `SELECT COUNT(*)::int AS found FROM "questions" WHERE "source_id" = ANY($1::int[])`,
          [ids],
        );
        console.log(`Rasmiy savollar: faylda ${ids.length} ta, bazada ${found} ta, ${changed} tasi faollashtirildi`);
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

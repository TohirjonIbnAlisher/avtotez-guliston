import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

// data/active-questions.json dagi rejim bo'yicha savollarning faolligini (is_active) o'rnatadi.
//   "ptest" — faqat ptest.uz mavzulari va biletlaridagi savollar faol, qolganlari nofaol:
//             rasmiy savollar — topic-order-keys.json va tickets.json'da uchraganlari,
//             qo'lda kiritilganlar — custom-questions.json'dagi hammasi.
//   "all"   — barcha savollar faol.
// Savollar o'chirilmaydi. Deploy'da release-seed tomonidan data/ o'zgarganda ishga tushiriladi.
//
//   npm run questions:apply-active

type Mode = 'ptest' | 'all';

const DATA_DIR = join(__dirname, '../../../data');
const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8')) as T;

function ptestSourceIds(): number[] {
  const topicKeys = readJson<Record<string, Record<string, number>>>('topic-order-keys.json');
  const tickets = readJson<{ questions: number[] }[]>('tickets.json');
  const custom = readJson<{ sourceId: number }[]>('custom-questions.json');
  return [
    ...new Set([
      ...Object.values(topicKeys).flatMap((byId) => Object.keys(byId).map(Number)),
      ...tickets.flatMap((t) => t.questions),
      ...custom.map((q) => q.sourceId),
    ]),
  ];
}

async function run() {
  const { mode } = readJson<{ mode: Mode }>('active-questions.json');
  if (mode !== 'ptest' && mode !== 'all') {
    throw new Error(`active-questions.json: noma'lum rejim "${String(mode)}" ("ptest" yoki "all")`);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const ds = app.get<DataSource>(getDataSourceToken());
    await ds.transaction(async (manager) => {
      if (mode === 'all') {
        await manager.query(`UPDATE "questions" SET "is_active" = true WHERE "is_active" = false`);
        return;
      }
      const ids = ptestSourceIds();
      await manager.query(
        `UPDATE "questions" SET "is_active" = COALESCE("source_id" = ANY($1::int[]), false)
         WHERE "is_active" IS DISTINCT FROM COALESCE("source_id" = ANY($1::int[]), false)`,
        [ids],
      );
      const [{ found }] = await manager.query(
        `SELECT COUNT(*)::int AS found FROM "questions" WHERE "source_id" = ANY($1::int[])`,
        [ids],
      );
      console.log(`ptest to'plami: ro'yxatda ${ids.length} ta, bazada topildi ${found} ta`);
    });
    const [{ active, total }] = await ds.query(
      `SELECT COUNT(*) FILTER (WHERE "is_active")::int AS active, COUNT(*)::int AS total FROM "questions"`,
    );
    console.log(`Rejim: ${mode}. Faol savollar: ${active} / ${total}`);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('Savollar faolligini o\'rnatishda xato:', err);
  process.exit(1);
});

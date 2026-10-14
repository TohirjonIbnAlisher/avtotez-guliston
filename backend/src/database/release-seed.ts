import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

// Deploy'dan keyin ma'lumotlarni avtomatik yangilash (Render bepul tarifida Shell yo'q).
//
// Server ishga tushishidan oldin chaqiriladi (npm run start:prod): data/ dagi fayllarning xeshi bazadagi
// oxirgi qiymat bilan solishtiriladi. Farq bo'lsa — mavzular, qo'lda kiritilgan savollar va biletlar
// seed'lari ketma-ket ishga tushadi va yangi xesh saqlanadi. O'zgarish bo'lmasa, hech narsa qilinmaydi.
// Xato bo'lsa server baribir ishga tushadi (xesh saqlanmaydi — keyingi ishga tushishda qayta urinadi).

const DATA_DIR = join(__dirname, '../../../data');
const DATA_FILES = [
  'questions/uz.json',
  'topic-overrides.json',
  'topic-order-keys.json',
  'custom-questions.json',
  'tickets.json',
  'question-videos.json',
];
const STATE_KEY = 'data-seed-hash';

// Ishga tushirish tartibi muhim: avval mavzular, keyin savollar, oxirida biletlar.
const STEPS: { script: string; args: string[] }[] = [
  { script: 'assign-topics', args: ['--prune'] },
  { script: 'seed-custom-questions', args: [] },
  { script: 'seed-tickets', args: [] },
];

function dataHash(): string {
  const hash = createHash('sha256');
  for (const file of DATA_FILES) {
    const path = join(DATA_DIR, file);
    hash.update(file);
    hash.update(existsSync(path) ? readFileSync(path) : 'missing');
  }
  return hash.digest('hex');
}

async function withDataSource<T>(fn: (ds: DataSource) => Promise<T>): Promise<T> {
  // App context migratsiyalarni ham ishga tushiradi (production'da migrationsRun: true).
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    return await fn(app.get<DataSource>(getDataSourceToken()));
  } finally {
    await app.close();
  }
}

function runStep(script: string, args: string[]): void {
  const ext = extname(__filename); // dist'da .js, ts-node bilan .ts
  const file = join(__dirname, `${script}${ext}`);
  const command = ext === '.ts' ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', file] : [file];
  console.log(`[release-seed] ${script} ${args.join(' ')}`.trim());
  execFileSync(process.execPath, [...command, ...args], { stdio: 'inherit', env: process.env });
}

async function main(): Promise<void> {
  const hash = dataHash();
  const stored = await withDataSource(async (ds) => {
    // Migratsiyasi tushib qolgan ustun/jadval bo'lsa — logda darhol ko'rinsin (sxemaga tegilmaydi).
    const diff = await ds.driver.createSchemaBuilder().log();
    if (diff.upQueries.length) {
      console.warn(`[release-seed] Ogohlantirish: baza sxemasi kod bilan mos emas (${diff.upQueries.length} ta farq):`);
      for (const q of diff.upQueries) console.warn('  ' + q.query);
    }
    await ds.query(
      `CREATE TABLE IF NOT EXISTS "seed_state" ("key" varchar PRIMARY KEY, "value" varchar NOT NULL, "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    const rows: { value: string }[] = await ds.query(`SELECT "value" FROM "seed_state" WHERE "key" = $1`, [STATE_KEY]);
    return rows[0]?.value ?? null;
  });

  if (stored === hash) {
    console.log("[release-seed] Ma'lumotlar o'zgarmagan — seed kerak emas.");
  } else {
    console.log("[release-seed] data/ o'zgargan — seed'lar ishga tushirilmoqda...");
    for (const step of STEPS) {
      runStep(step.script, step.args);
    }

    await withDataSource((ds) =>
      ds.query(
        `INSERT INTO "seed_state" ("key", "value", "updated_at") VALUES ($1, $2, now())
         ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updated_at" = now()`,
        [STATE_KEY, hash],
      ),
    );
  }

  // Har safar: kirillcha/ruscha ko'rinishi yo'q mavzu va savollar to'ldiriladi (tarmoq xatosida — keyingi safar).
  try {
    runStep('translate-missing', []);
  } catch (err) {
    console.warn("[release-seed] Tarjimalarni to'ldirib bo'lmadi:", (err as Error).message);
  }
  console.log('[release-seed] Tayyor.');
}

main()
  .catch((err) => {
    console.error('[release-seed] Xato (server baribir ishga tushadi):', err);
  })
  .finally(() => process.exit(0));

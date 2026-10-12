import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Topic } from '../topics/entities/topic.entity';
import { TOPICS } from './topic-catalog';
import { renumberTopicOrder } from '../questions/topic-order';
import { CLASSIFIER_TOPICS, ClassifySource, classifyQuestion } from './topic-classifier';

// Mavzular katalogini bazaga yozadi (nom bo'yicha upsert — mavjud mavzular id'si saqlanadi)
// va savollarni mavzularga biriktiradi:
//   1) data/topic-overrides.json — ptest.uz mavzulariga moslab aniqlangan biriktirishlar;
//   2) qolganlari — izohdagi YHQ havolasi bo'yicha (topic-classifier).
//
//   npm run seed:assign-topics -- --dry-run      faqat natijani ko'rsatadi, bazaga yozmaydi
//   npm run seed:assign-topics -- --only-empty   faqat mavzusi yo'q savollarni biriktiradi (qo'lda qo'yilganlar saqlanadi)
//   npm run seed:assign-topics -- --prune        katalogda yo'q eski mavzularni o'chiradi

interface RawQuestion {
  id: number;
  question: string;
  description?: string;
}

interface TopicOverrides {
  /** null — savol hech qaysi mavzuga biriktirilmaydi (ptest.uz mavzularida yo'q; random test va biletlarda qoladi). */
  overrides: Record<string, string | null>;
}

const NO_TOPIC = '__no_topic__';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const ONLY_EMPTY = args.has('--only-empty');
const PRUNE = args.has('--prune');

async function run() {
  const catalogNames = new Set(TOPICS.map((t) => t.name));
  const curatedNames = new Set(TOPICS.filter((t) => t.curated).map((t) => t.name));
  const unknown = CLASSIFIER_TOPICS.filter((name) => !catalogNames.has(name));
  if (unknown.length) {
    throw new Error(`Tasniflagichdagi mavzular katalogda yo'q: ${unknown.join(', ')}`);
  }

  const dataDir = join(__dirname, '../../../data');
  const raw: RawQuestion[] = JSON.parse(readFileSync(join(dataDir, 'questions/uz.json'), 'utf-8'));
  const { overrides }: TopicOverrides = JSON.parse(
    readFileSync(join(dataDir, 'topic-overrides.json'), 'utf-8'),
  );
  const badOverrides = [...new Set(Object.values(overrides))].filter(
    (name): name is string => name !== null && !catalogNames.has(name),
  );
  if (badOverrides.length) {
    throw new Error(`topic-overrides.json dagi mavzular katalogda yo'q: ${badOverrides.join(', ')}`);
  }

  const bySource = new Map<string, number[]>();
  const sourceStats = new Map<ClassifySource | 'ptest', number>();
  for (const q of raw) {
    const override = overrides[String(q.id)];
    const { topic, source } =
      override === null
        ? { topic: NO_TOPIC, source: 'ptest' as const }
        : override
          ? { topic: override, source: 'ptest' as const }
          : classifyQuestion(q.id, q.question, q.description);
    bySource.set(topic, [...(bySource.get(topic) ?? []), q.id]);
    sourceStats.set(source, (sourceStats.get(source) ?? 0) + 1);
  }

  console.log(`Savollar: ${raw.length}`);
  console.log('Aniqlash usuli:', Object.fromEntries(sourceStats));
  for (const t of TOPICS) {
    const count = String(bySource.get(t.name)?.length ?? 0).padStart(3);
    const note = t.curated ? "  (qo'lda tuzilgan — bu savollar mavzusiz qoladi)" : '';
    console.log(`  ${count}  ${t.category} / ${t.name}${note}`);
  }

  if (DRY_RUN) {
    console.log('--dry-run: bazaga hech narsa yozilmadi.');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    await dataSource.transaction(async (manager) => {
      const topicsRepo = manager.getRepository(Topic);
      const existing = new Map((await topicsRepo.find()).map((t) => [t.name, t]));

      const idByName = new Map<string, string>();
      for (const [index, seed] of TOPICS.entries()) {
        const topic = existing.get(seed.name) ?? topicsRepo.create({ name: seed.name });
        topic.category = seed.category;
        topic.sortOrder = index + 1;
        const saved = await topicsRepo.save(topic);
        idByName.set(seed.name, saved.id);
      }
      console.log(`Mavzular katalogi yozildi: ${TOPICS.length} ta`);

      let updated = 0;
      for (const [name, sourceIds] of bySource) {
        const result: [unknown[], number] = await manager.query(
          // Mavzusi o'zgargan savol yangi mavzuning oxiriga tushadi; qolganlarining tartibi saqlanadi.
          `UPDATE "questions" SET "topic_id" = $1,
             "topic_order" = CASE WHEN "topic_id" IS DISTINCT FROM $1::uuid THEN NULL ELSE "topic_order" END
           WHERE "source_id" = ANY($2::int[]) ${ONLY_EMPTY ? 'AND "topic_id" IS NULL' : ''}`,
          // Qo'lda tuzilgan mavzuga rasmiy savollar biriktirilmaydi — ular mavzusiz qoladi
          // (random test va biletlarda baribir ishtirok etadi).
          [curatedNames.has(name) || name === NO_TOPIC ? null : idByName.get(name), sourceIds],
        );
        updated += result[1];
      }
      console.log(`Savollar biriktirildi: ${updated}${ONLY_EMPTY ? ' (faqat mavzusizlar)' : ''}`);
      await renumberTopicOrder(manager);

      const obsolete = [...existing.values()].filter((t) => !catalogNames.has(t.name));
      if (obsolete.length) {
        const names = obsolete.map((t) => t.name).join(', ');
        if (PRUNE) {
          await topicsRepo.remove(obsolete);
          console.log(`Katalogda yo'q mavzular o'chirildi: ${names}`);
        } else {
          console.log(`Katalogda yo'q mavzular qoldi (o'chirish uchun --prune): ${names}`);
        }
      }
    });

    const [{ count }] = await dataSource.query(
      `SELECT count(*)::int AS count FROM "questions" WHERE "topic_id" IS NULL`,
    );
    console.log(`Mavzusiz savollar: ${count}`);
    if (curatedNames.size) {
      console.log(
        `Qo'lda tuzilgan mavzular (${[...curatedNames].join(', ')}) uchun: npm run seed:custom-questions`,
      );
    }
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('Mavzularni biriktirishda xato:', err);
  process.exit(1);
});

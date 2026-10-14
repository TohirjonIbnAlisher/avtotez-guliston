import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { AppModule } from '../app.module';
import { Topic } from '../topics/entities/topic.entity';
import { Question } from '../questions/entities/question.entity';
import { buildTopicTranslations } from '../topics/localize-topic';
import { completeLocales } from '../i18n/auto-translate';

// Kirillcha/ruscha ko'rinishi yo'q mavzu va savollarni o'zbekchasidan to'ldiradi (release-seed har safar chaqiradi).
//   npm run i18n:translate-missing -- --dry-run   faqat nechtasi to'ldirilishini ko'rsatadi
//   npm run i18n:translate-missing -- --all       nofaol savollar ham (sukut bo'yicha faqat faollari)

const DRY_RUN = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');
const blank = (v: string | null | undefined) => !v?.trim();

function questionNeedsLocales(q: Question): boolean {
  const optionsUz = q.options?.uz ?? [];
  return (
    blank(q.text?.uzk) ||
    blank(q.text?.ru) ||
    optionsUz.some((_, i) => blank(q.options?.uzk?.[i]) || blank(q.options?.ru?.[i])) ||
    (!blank(q.explanation?.uz) && (blank(q.explanation?.uzk) || blank(q.explanation?.ru)))
  );
}

async function fillQuestion(q: Question): Promise<void> {
  const optionsUz = q.options.uz ?? [];
  const hasExplanation = !blank(q.explanation?.uz);
  const items = [
    q.text,
    ...optionsUz.map((uz, i) => ({ uz, uzk: q.options.uzk?.[i], ru: q.options.ru?.[i] })),
    ...(hasExplanation ? [q.explanation as { uz: string }] : []),
  ];
  const done = await completeLocales(items);
  q.text = done[0];
  const rows = done.slice(1, 1 + optionsUz.length);
  q.options = { uz: rows.map((r) => r.uz), uzk: rows.map((r) => r.uzk), ru: rows.map((r) => r.ru) };
  if (hasExplanation) {
    q.explanation = { ...q.explanation, ...done[1 + optionsUz.length] };
  }
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const ds = app.get<DataSource>(getDataSourceToken());
    const topicsRepo = ds.getRepository(Topic);
    const questionsRepo = ds.getRepository(Question);

    const topics = await topicsRepo.find({ where: { translations: IsNull() } });
    const questions = (await questionsRepo.find({ where: ALL ? {} : { isActive: true } })).filter(questionNeedsLocales);
    console.log(`[translate-missing] tarjimasiz: ${topics.length} ta mavzu, ${questions.length} ta savol`);
    if (DRY_RUN) {
      return;
    }

    let failed = 0;
    for (const topic of topics) {
      try {
        topic.translations = await buildTopicTranslations(topic);
        await topicsRepo.update({ id: topic.id }, { translations: topic.translations });
      } catch (err) {
        failed++;
        console.warn(`[translate-missing] mavzu "${topic.name}": ${(err as Error).message}`);
      }
    }
    for (const q of questions) {
      try {
        await fillQuestion(q);
        await questionsRepo.update({ id: q.id }, { text: q.text, options: q.options, explanation: q.explanation });
      } catch (err) {
        failed++;
        console.warn(`[translate-missing] savol ${q.id}: ${(err as Error).message}`);
      }
    }
    console.log(`[translate-missing] tayyor${failed ? ` (${failed} ta xato — keyingi safar qayta urinadi)` : ''}`);
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Question } from '../questions/entities/question.entity';
import { Topic } from '../topics/entities/topic.entity';
import { renumberTopicOrder } from '../questions/topic-order';
import { LOCALES, LocalizedExplanation, LocalizedOptions, LocalizedText } from '../questions/locale';

// Qo'lda kiritilgan savollar (data/custom-questions.json) ni bazaga yozadi — source_id bo'yicha upsert,
// shuning uchun qayta ishga tushirish xavfsiz: mavjud savol yangilanadi, id (va foydalanuvchilar progressi) saqlanadi.
//
// source_id 10001 dan boshlanadi — rasmiy baza (uz.json, 1–700) bilan to'qnashmasligi uchun.
// Eslatma: `npm run seed` barcha savollarni o'chiradi; undan keyin bu skriptni qayta ishga tushiring.
//
//   npm run seed:custom-questions

const MIN_CUSTOM_SOURCE_ID = 10001;

interface CustomQuestion {
  sourceId: number;
  topic: string;
  image: string | null;
  correctOptionIndex: number;
  text: LocalizedText;
  options: LocalizedOptions;
  explanation: LocalizedExplanation;
}

function validate(q: CustomQuestion): void {
  const where = `sourceId=${q.sourceId}`;
  if (!Number.isInteger(q.sourceId) || q.sourceId < MIN_CUSTOM_SOURCE_ID) {
    throw new Error(`${where}: sourceId ${MIN_CUSTOM_SOURCE_ID} dan kichik bo'lmasligi kerak`);
  }
  const counts = LOCALES.map((l) => q.options[l]?.length ?? 0);
  if (counts.some((c) => c !== counts[0]) || counts[0] < 2) {
    throw new Error(`${where}: javob variantlari soni tillar bo'yicha bir xil emas (${counts.join('/')})`);
  }
  if (q.correctOptionIndex < 0 || q.correctOptionIndex >= counts[0]) {
    throw new Error(`${where}: correctOptionIndex variantlar oralig'ida emas`);
  }
  for (const l of LOCALES) {
    if (!q.text[l]) throw new Error(`${where}: ${l} tilida savol matni yo'q`);
  }
}

async function run() {
  const items: CustomQuestion[] = JSON.parse(
    readFileSync(join(__dirname, '../../../data/custom-questions.json'), 'utf-8'),
  );
  items.forEach(validate);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    await dataSource.transaction(async (manager) => {
      const topics = new Map((await manager.find(Topic)).map((t) => [t.name, t]));
      const questionsRepo = manager.getRepository(Question);

      let created = 0;
      let updated = 0;
      for (const item of items) {
        const topic = topics.get(item.topic);
        if (!topic) {
          throw new Error(
            `sourceId=${item.sourceId}: "${item.topic}" mavzusi bazada yo'q — avval npm run seed:assign-topics`,
          );
        }
        const existing = await questionsRepo.findOne({
          where: { sourceId: item.sourceId },
          relations: { topic: true },
        });
        const question = existing ?? questionsRepo.create({ sourceId: item.sourceId });
        if (existing?.topic?.id !== topic.id) {
          question.topicOrder = null; // yangi yoki mavzusi o'zgargan savol — mavzu oxiriga
        }
        Object.assign(question, {
          text: item.text,
          options: item.options,
          correctOptionIndex: item.correctOptionIndex,
          imageUrl: item.image,
          explanation: item.explanation,
          topic,
        });
        await questionsRepo.save(question);
        if (existing) updated += 1;
        else created += 1;
      }
      await renumberTopicOrder(manager);
      console.log(`Qo'lda kiritilgan savollar: ${created} ta qo'shildi, ${updated} ta yangilandi`);
    });
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error("Qo'lda kiritilgan savollarni yozishda xato:", err);
  process.exit(1);
});

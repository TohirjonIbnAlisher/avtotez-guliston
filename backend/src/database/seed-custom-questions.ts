import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Question } from '../questions/entities/question.entity';
import { Topic } from '../topics/entities/topic.entity';
import { makeRoomAt, renumberTopicOrder } from '../questions/topic-order';
import { LOCALES, LocalizedExplanation, LocalizedOptions, LocalizedText } from '../questions/locale';

// Qo'lda kiritilgan savollar (data/custom-questions.json) ni bazaga yozadi — source_id bo'yicha upsert,
// shuning uchun qayta ishga tushirish xavfsiz: mavjud savol yangilanadi, id (va foydalanuvchilar progressi) saqlanadi.
//
// source_id 10001 dan boshlanadi — rasmiy baza (uz.json, 1–700) bilan to'qnashmasligi uchun.
// Eslatma: `npm run seed` barcha savollarni o'chiradi; undan keyin bu skriptni qayta ishga tushiring.
//
//   npm run seed:custom-questions
//
// Shu skript data/question-videos.json dagi izoh-videolarni ham savollarga biriktiradi.

const MIN_CUSTOM_SOURCE_ID = 10001;

interface CustomQuestion {
  sourceId: number;
  topic: string | null;
  image: string | null;
  correctOptionIndex: number;
  text: LocalizedText;
  options: LocalizedOptions;
  explanation: LocalizedExplanation;
  /**
   * Mavzudagi o'rni (1 dan). Savol bazaga birinchi marta qo'shilganda shu o'ringa qo'yiladi va
   * keyingilari bittaga suriladi; qayta ishga tushirilganda mavjud savolning o'rni o'zgarmaydi.
   * Berilmasa — mavzu oxiriga.
   */
  topicOrder?: number;
}

function validate(q: CustomQuestion): void {
  const where = `sourceId=${q.sourceId}`;
  if (!Number.isInteger(q.sourceId) || q.sourceId < MIN_CUSTOM_SOURCE_ID) {
    throw new Error(`${where}: sourceId ${MIN_CUSTOM_SOURCE_ID} dan kichik bo'lmasligi kerak`);
  }
  // uz majburiy; uzk/ru ixtiyoriy (yo'q bo'lsa sayt uz matnini ko'rsatadi), lekin bo'lsa — variantlar soni bir xil
  const counts = LOCALES.filter((l) => q.options[l]).map((l) => q.options[l].length);
  if (!q.options.uz || counts.some((c) => c !== q.options.uz.length) || q.options.uz.length < 2) {
    throw new Error(`${where}: javob variantlari soni tillar bo'yicha bir xil emas (${counts.join('/')})`);
  }
  if (q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.uz.length) {
    throw new Error(`${where}: correctOptionIndex variantlar oralig'ida emas`);
  }
  if (!q.text.uz) throw new Error(`${where}: uz tilida savol matni yo'q`);
  if (q.topicOrder !== undefined && (!Number.isInteger(q.topicOrder) || q.topicOrder < 1)) {
    throw new Error(`${where}: topicOrder 1 dan boshlanadigan butun son bo'lishi kerak`);
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

      await renumberTopicOrder(manager); // makeRoomAt uchun raqamlar bo'shliqsiz bo'lishi kerak
      let created = 0;
      let updated = 0;
      for (const item of items) {
        // topic: null — faqat biletlarda uchraydigan savol (hech bir mavzuga kirmaydi)
        const topic = item.topic === null ? null : topics.get(item.topic);
        if (topic === undefined) {
          throw new Error(
            `sourceId=${item.sourceId}: "${item.topic}" mavzusi bazada yo'q — avval npm run seed:assign-topics`,
          );
        }
        const existing = await questionsRepo.findOne({
          where: { sourceId: item.sourceId },
          relations: { topic: true },
        });
        const question = existing ?? questionsRepo.create({ sourceId: item.sourceId });
        if (!topic) {
          question.topicOrder = null;
        } else if (existing?.topic?.id !== topic.id) {
          // yangi yoki mavzusi o'zgargan savol — ko'rsatilgan o'ringa (yoki mavzu oxiriga)
          if (item.topicOrder) {
            await makeRoomAt(manager, topic.id, item.topicOrder);
          }
          question.topicOrder = item.topicOrder ?? null;
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

      // Mavzular ichidagi tartibni ptest.uz ("Yodlash" rejimi) raqamlariga moslash:
      // qo'lda kiritilganlar — topicOrder, rasmiylar — data/topic-order-keys.json bo'yicha.
      // Raqami ma'lum bo'lmagan savollar hozirgi o'rnini kalit sifatida saqlaydi.
      const keysByTopic: Record<string, Record<string, number>> = JSON.parse(
        readFileSync(join(__dirname, '../../../data/topic-order-keys.json'), 'utf-8'),
      );
      const customKeys = new Map(items.filter((i) => i.topicOrder).map((i) => [i.sourceId, i.topicOrder!]));
      const orderedTopics = new Set([...Object.keys(keysByTopic), ...items.filter((i) => i.topicOrder && i.topic).map((i) => i.topic!)]);
      for (const name of orderedTopics) {
        const topic = topics.get(name);
        if (!topic) continue;
        const rows: { id: string; source_id: number | null; topic_order: number }[] = await manager.query(
          `SELECT "id", "source_id", "topic_order" FROM "questions" WHERE "topic_id" = $1 ORDER BY "topic_order"`,
          [topic.id],
        );
        const official = keysByTopic[name] ?? {};
        // ptest raqami yo'q savollar (ptest'da bu mavzuda yo'q) mavzu oxiriga, o'zaro tartibi saqlanadi
        const keyOf = (r: (typeof rows)[number]) =>
          (r.source_id !== null && (customKeys.get(r.source_id) ?? official[String(r.source_id)])) ||
          100000 + r.topic_order;
        const sorted = [...rows].sort((a, b) => keyOf(a) - keyOf(b) || a.topic_order - b.topic_order);
        await manager.query(
          `UPDATE "questions" q SET "topic_order" = t.pos
           FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, pos) WHERE q."id" = t.id`,
          [sorted.map((r) => r.id)],
        );
      }

      // Izoh-videolar: data/question-videos.json — { source_id: video manzili }.
      // Ro'yxatda yo'q savollarga tegilmaydi — admin panelda yuklangan videolar saqlanib qoladi.
      const videos: Record<string, string> = JSON.parse(
        readFileSync(join(__dirname, '../../../data/question-videos.json'), 'utf-8'),
      );
      for (const [sourceId, url] of Object.entries(videos)) {
        await manager.query(`UPDATE "questions" SET "video_url" = $1 WHERE "source_id" = $2`, [url, Number(sourceId)]);
      }
      console.log(`Izoh-videolar: ${Object.keys(videos).length} ta savolga biriktirildi`);
    });
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error("Qo'lda kiritilgan savollarni yozishda xato:", err);
  process.exit(1);
});

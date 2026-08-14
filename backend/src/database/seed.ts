import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { TopicsService } from '../topics/topics.service';
import { Question } from '../questions/entities/question.entity';
import { Locale } from '../questions/locale';

interface TopicRow {
  name: string;
  description?: string;
}

interface RawChoice {
  text: string;
  answer: boolean;
}

interface RawQuestion {
  id: number;
  question: string;
  choices?: RawChoice[];
  choises?: RawChoice[]; // uzk.json va ru.json fayllarida shu (xato) nom ishlatilgan
  media?: { exist: boolean; name?: string };
  description?: string;
}

// Manba fayllarda hech qaysi tilda to'g'ri javob belgilanmagan savollar uchun
// description matniga asosan qo'lda aniqlangan to'g'ri javob indeksi (0-based)
const MANUAL_CORRECT_INDEX_FIXES: Record<number, number> = {
  156: 2, // "Og'irlik markazi pastda joylashganda" — description shuni tasdiqlaydi
};

function choicesOf(q: RawQuestion): RawChoice[] {
  return q.choices ?? q.choises ?? [];
}

function loadLangFile(dataDir: string, filename: string): Map<number, RawQuestion> {
  const raw = readFileSync(join(dataDir, filename), 'utf-8');
  const list: RawQuestion[] = JSON.parse(raw);
  return new Map(list.map((q) => [q.id, q]));
}

function parseCsv<T>(filePath: string): T[] {
  const content = readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

async function seedTopics(dataDir: string, topicsService: TopicsService) {
  const existing = await topicsService.findAll();
  if (existing.length > 0) {
    console.log(`Mavzular allaqachon mavjud (${existing.length}), o'tkazib yuborildi.`);
    return;
  }

  const topicRows = parseCsv<TopicRow>(join(dataDir, 'topics_template.csv'));
  for (const row of topicRows) {
    await topicsService.create({
      name: row.name,
      description: row.description || undefined,
    });
  }
  console.log(`Mavzular qo'shildi: ${topicRows.length}`);
}

async function seedQuestions(
  dataDir: string,
  questionsRepo: Repository<Question>,
) {
  const questionsDir = join(dataDir, 'questions');
  const uzMap = loadLangFile(questionsDir, 'uz.json');
  const uzkMap = loadLangFile(questionsDir, 'uzk.json');
  const ruMap = loadLangFile(questionsDir, 'ru.json');

  console.log('Eski savollarni tozalash...');
  await questionsRepo.query('DELETE FROM "questions"');

  const entities: Question[] = [];
  let fixedCount = 0;
  let skippedCount = 0;

  for (const [id, uzQ] of uzMap) {
    const uzkQ = uzkMap.get(id);
    const ruQ = ruMap.get(id);
    if (!uzkQ || !ruQ) {
      console.warn(`  id=${id}: barcha tillarda topilmadi, o'tkazib yuborildi`);
      skippedCount += 1;
      continue;
    }

    const uzChoices = choicesOf(uzQ);
    const uzkChoices = choicesOf(uzkQ);
    const ruChoices = choicesOf(ruQ);

    let correctOptionIndex = uzChoices.findIndex((c) => c.answer);
    if (correctOptionIndex === -1) correctOptionIndex = uzkChoices.findIndex((c) => c.answer);
    if (correctOptionIndex === -1) correctOptionIndex = ruChoices.findIndex((c) => c.answer);
    if (correctOptionIndex === -1) {
      if (id in MANUAL_CORRECT_INDEX_FIXES) {
        correctOptionIndex = MANUAL_CORRECT_INDEX_FIXES[id];
        fixedCount += 1;
      } else {
        console.warn(`  id=${id}: hech qaysi tilda to'g'ri javob topilmadi, o'tkazib yuborildi`);
        skippedCount += 1;
        continue;
      }
    }

    // rasm nomini aniqlash: uchala tildan savol id'siga mos nomni ustuvor olamiz
    // (manbada ba'zi qatorlarda rasm nomi xato ko'rsatilgan, masalan id=612)
    const idStr = String(id);
    const mediaCandidates = [uzQ.media, uzkQ.media, ruQ.media]
      .filter((m): m is { exist: boolean; name?: string } => Boolean(m?.exist && m.name))
      .map((m) => m.name as string);
    const mediaName = mediaCandidates.includes(idStr)
      ? idStr
      : (mediaCandidates[0] ?? null);

    const text: Record<Locale, string> = {
      uz: uzQ.question,
      uzk: uzkQ.question,
      ru: ruQ.question,
    };
    const options: Record<Locale, string[]> = {
      uz: uzChoices.map((c) => c.text),
      uzk: uzkChoices.map((c) => c.text),
      ru: ruChoices.map((c) => c.text),
    };
    const explanation: Record<Locale, string | null> = {
      uz: uzQ.description ?? null,
      uzk: uzkQ.description ?? null,
      ru: ruQ.description ?? null,
    };

    entities.push(
      questionsRepo.create({
        sourceId: id,
        text,
        options,
        correctOptionIndex,
        imageUrl: mediaName ? `/media/questions/${mediaName}.png` : null,
        explanation,
        isTricky: false,
        isNumberRelated: false,
        topic: null,
      }),
    );
  }

  console.log(
    `Savollar tayyorlandi: ${entities.length} (${fixedCount} ta qo'lda tuzatildi, ${skippedCount} ta o'tkazib yuborildi)`,
  );

  const chunkSize = 100;
  for (let i = 0; i < entities.length; i += chunkSize) {
    await questionsRepo.save(entities.slice(i, i + chunkSize));
  }
  console.log(`Savollar bazaga yozildi: ${entities.length}`);
}

async function seed() {
  const dataDir = join(__dirname, '../../../data');
  const app = await NestFactory.createApplicationContext(AppModule);

  const topicsService = app.get(TopicsService);
  const questionsRepo = app.get<Repository<Question>>(getRepositoryToken(Question));

  await seedTopics(dataDir, topicsService);
  await seedQuestions(dataDir, questionsRepo);

  await app.close();
}

seed().catch((err) => {
  console.error('Seed jarayonida xato:', err);
  process.exit(1);
});

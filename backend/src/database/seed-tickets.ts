import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Ticket } from '../tickets/entities/ticket.entity';

// Biletlarni data/tickets.json bo'yicha qayta yaratadi (ptest.uz biletlari tarkibi va tartibi).
// Savollar source_id bo'yicha topiladi, shuning uchun avval seed:custom-questions ishga tushirilgan bo'lishi kerak.
// Mavjud biletlar id'si raqam bo'yicha saqlanadi (bilet natijalari ham raqamga bog'langan).
//
//   npm run seed:tickets

interface TicketSeed {
  number: number;
  /** Savollarning source_id'lari — bilet ichidagi tartibda. */
  questions: number[];
}

async function run() {
  const seeds: TicketSeed[] = JSON.parse(readFileSync(join(__dirname, '../../../data/tickets.json'), 'utf-8'));

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    await dataSource.transaction(async (manager) => {
      const rows: { id: string; source_id: number }[] = await manager.query(
        `SELECT "id", "source_id" FROM "questions" WHERE "source_id" IS NOT NULL`,
      );
      const idBySource = new Map(rows.map((r) => [Number(r.source_id), r.id]));
      const missing = seeds.flatMap((t) => t.questions.filter((s) => !idBySource.has(s)).map((s) => `${t.number}:${s}`));
      if (missing.length) {
        throw new Error(`Bazada topilmagan savollar (bilet:source_id): ${missing.join(', ')}`);
      }

      const repo = manager.getRepository(Ticket);
      const existing = new Map((await repo.find()).map((t) => [t.number, t]));
      for (const seed of seeds) {
        const ids = seed.questions.map((s) => idBySource.get(s)!);
        const ticket = existing.get(seed.number) ?? repo.create({ number: seed.number });
        ticket.questionOrder = ids;
        ticket.questions = ids.map((id) => ({ id }) as Ticket['questions'][number]);
        await repo.save(ticket);
      }
      const extra = [...existing.values()].filter((t) => !seeds.some((s) => s.number === t.number));
      if (extra.length) {
        await repo.remove(extra);
      }
      console.log(`Biletlar: ${seeds.length} ta yozildi, ${extra.length} ta ortiqcha o'chirildi`);
    });
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('Biletlarni yozishda xato:', err);
  process.exit(1);
});

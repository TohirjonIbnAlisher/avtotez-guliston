import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Question } from '../questions/entities/question.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

const TICKET_SIZE = 20;

// uz matnidagi kalit so'zlarga asosan taxminiy mavzu biriktirish.
// Aniqlik kafolatlanmaydi — qo'lda tekshirib chiqish tavsiya etiladi.
const TOPIC_RULES: { name: string; pattern: RegExp }[] = [
  {
    name: 'Tibbiy yordam',
    pattern: /tibbiy yordam|aptechka|shifokor|jarohat|qon ketish|reanimatsiy|yurak-o'pka|singan|kuyish|jabrlangan/i,
  },
  {
    name: 'Jarima va javobgarlik',
    pattern: /jarima|javobgarlik|huquqidan mahrum|ma'muriy/i,
  },
  {
    name: 'Tezlik va masofa',
    pattern: /tezlik|km\/soat|masofa/i,
  },
  {
    name: 'Ustunlik huquqi',
    pattern: /ustunlik|chorraha|aylanma harakat|yo'l ber/i,
  },
  {
    name: "Yo'l chiziqlari va belgilanishi",
    pattern: /chiziq|belgilanish/i,
  },
  {
    name: "Yo'l belgilari",
    pattern: /belgi/i,
  },
];

async function assignTopics(
  questionsRepo: Repository<Question>,
  topicsRepo: Repository<Topic>,
) {
  const topics = await topicsRepo.find();
  const topicByName = new Map(topics.map((t) => [t.name, t]));
  const questions = await questionsRepo.find();

  let matched = 0;
  for (const question of questions) {
    const text = question.text.uz ?? '';
    const rule = TOPIC_RULES.find((r) => r.pattern.test(text));
    const topic = rule ? topicByName.get(rule.name) : undefined;
    if (topic) {
      question.topic = topic;
      matched += 1;
    }
  }

  await questionsRepo.save(questions);
  console.log(`Mavzular biriktirildi: ${matched}/${questions.length}`);
}

async function assignTickets(
  questionsRepo: Repository<Question>,
  ticketsRepo: Repository<Ticket>,
) {
  const existing = await ticketsRepo.find();
  if (existing.length > 0) {
    console.log(`Biletlar allaqachon mavjud (${existing.length}), o'tkazib yuborildi.`);
    return;
  }

  const questions = await questionsRepo.find({ order: { sourceId: 'ASC' } });
  const tickets: Ticket[] = [];
  for (let i = 0; i < questions.length; i += TICKET_SIZE) {
    tickets.push(
      ticketsRepo.create({
        number: Math.floor(i / TICKET_SIZE) + 1,
        questions: questions.slice(i, i + TICKET_SIZE),
      }),
    );
  }

  await ticketsRepo.save(tickets);
  console.log(`Biletlar yaratildi: ${tickets.length}`);
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const questionsRepo = app.get<Repository<Question>>(getRepositoryToken(Question));
  const topicsRepo = app.get<Repository<Topic>>(getRepositoryToken(Topic));
  const ticketsRepo = app.get<Repository<Ticket>>(getRepositoryToken(Ticket));

  await assignTopics(questionsRepo, topicsRepo);
  await assignTickets(questionsRepo, ticketsRepo);

  await app.close();
}

run().catch((err) => {
  console.error("Metadata biriktirishda xato:", err);
  process.exit(1);
});

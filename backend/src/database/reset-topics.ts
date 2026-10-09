import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Topic } from '../topics/entities/topic.entity';
import { Question } from '../questions/entities/question.entity';
import { TOPICS } from './topic-catalog';



async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const topicsRepo = app.get<Repository<Topic>>(getRepositoryToken(Topic));
  const questionsRepo = app.get<Repository<Question>>(getRepositoryToken(Question));

  console.log('Eski mavzularni savollardan uzish...');
  await questionsRepo.query('UPDATE "questions" SET "topic_id" = NULL');

  console.log('Eski mavzularni o\'chirish...');
  await topicsRepo.query('DELETE FROM "topics"');

  console.log(`Yangi mavzularni qo'shish (${TOPICS.length} ta)...`);
  const entities = TOPICS.map((t, index) =>
    topicsRepo.create({ name: t.name, category: t.category, sortOrder: index + 1 }),
  );
  await topicsRepo.save(entities);

  console.log('Tayyor.');
  await app.close();
}

run().catch((err) => {
  console.error("Mavzularni almashtirishda xato:", err);
  process.exit(1);
});

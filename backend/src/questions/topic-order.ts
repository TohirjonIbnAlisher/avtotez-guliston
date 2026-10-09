import { EntityManager } from 'typeorm';

/**
 * Mavzu ichidagi tartib raqamlarini 1, 2, 3, ... ko'rinishiga keltiradi (bo'shliq va takrorlarsiz).
 * Mavjud tartib saqlanadi; tartib raqami yo'q (null) savollar oxiriga, manba id bo'yicha qo'shiladi.
 * Mavzusiz savollarning tartib raqami tozalanadi.
 */
export async function renumberTopicOrder(manager: EntityManager, topicIds?: (string | null)[]): Promise<void> {
  const ids = topicIds?.filter((id): id is string => !!id);
  if (ids && !ids.length) {
    return;
  }
  await manager.query(
    `UPDATE "questions" q SET "topic_order" = s.rn
     FROM (
       SELECT "id", ROW_NUMBER() OVER (
         PARTITION BY "topic_id" ORDER BY "topic_order" ASC NULLS LAST, "source_id" ASC NULLS LAST, "id"
       ) AS rn
       FROM "questions"
       WHERE "topic_id" IS NOT NULL ${ids ? 'AND "topic_id" = ANY($1::uuid[])' : ''}
     ) s
     WHERE q."id" = s."id" AND q."topic_order" IS DISTINCT FROM s.rn`,
    ids ? [ids] : [],
  );
  await manager.query(
    `UPDATE "questions" SET "topic_order" = NULL WHERE "topic_id" IS NULL AND "topic_order" IS NOT NULL`,
  );
}

/** Savolni mavzuning `position`-o'rniga qo'yish uchun shu o'rindan boshlab keyingilarni bir pog'ona suradi. */
export async function makeRoomAt(manager: EntityManager, topicId: string, position: number): Promise<void> {
  await manager.query(
    `UPDATE "questions" SET "topic_order" = "topic_order" + 1
     WHERE "topic_id" = $1 AND "topic_order" >= $2`,
    [topicId, position],
  );
}

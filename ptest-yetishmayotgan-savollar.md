# ptest.uz bilan taqqoslash

Barcha 42 ta mavzu ptest.uz bilan to'liq bir xil: jami 1265 ta savol, har bir mavzuda savollar
ptest.uz'ning "Yodlash" rejimidagi tartibida (1, 2, 3, ...).

- Rasmiy bazadagi savollarning ptest raqamlari: `data/topic-order-keys.json`
- ptest.uz'dan ko'chirilgan va qo'lda kiritilgan savollar: `data/custom-questions.json` (`topicOrder` — ptest raqami)
- ptest.uz mavzularida yo'q rasmiy savollar (`null`): `data/topic-overrides.json` — ular mavzusiz, lekin random test va biletlarda qatnashadi

Qo'llash: `npm run seed:assign-topics -- --prune`, keyin `npm run seed:custom-questions`.

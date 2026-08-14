# Avtotez Guliston — Backend

NestJS + TypeORM + PostgreSQL asosidagi REST API.

## Modullar

- `questions` — test savollari (matn, variantlar, to'g'ri javob, mavzu, "chalg'ituvchi"/"raqamga oid" belgilar)
- `topics` — savol mavzulari (masalan: "Yo'l belgilari", "Ustunlik huquqi", "Jarimalar")
- `tickets` — rasmiy biletlar (har biri bir nechta savoldan iborat guruh)

## Ishga tushirish

1. `.env.example` faylidan nusxa olib `.env` yarating va PostgreSQL ma'lumotlarini kiriting:
   ```
   cp .env.example .env
   ```
2. Paketlarni o'rnating:
   ```
   npm install
   ```
3. Development rejimida ishga tushiring:
   ```
   npm run start:dev
   ```

`synchronize: true` development rejimida yoqilgan (jadvallar avtomatik yaratiladi). Production'da migratsiyalar qo'shiladi.

## API

| Metod | Yo'l | Tavsif |
|---|---|---|
| GET | `/questions` | Barcha savollar (filtrlar: `topicId`, `isTricky`, `isNumberRelated`) |
| GET | `/questions/random?count=20` | Imtihonni simulyatsiya qilish uchun tasodifiy savollar |
| GET/POST/PATCH/DELETE | `/questions/:id` | CRUD |
| GET/POST/PATCH/DELETE | `/topics/:id` | CRUD |
| GET/POST/PATCH/DELETE | `/tickets/:id` | CRUD |

## Keyingi bosqichlar (rejalashtirilgan)

- `auth` — foydalanuvchi ro'yxatdan o'tishi/kirishi (JWT)
- `users` — o'quvchi profili, progress, statistika
- `exam-sessions` — imtihon simulyatsiyasi natijalarini saqlash
- Musobaqa (multiplayer quiz) uchun WebSocket gateway

# Loyihani ishga tushirish

## 1. Ma'lumotlar bazasi (PostgreSQL, Docker orqali)

Docker Desktop ishga tushirilgan bo'lishi kerak, keyin root papkada:

```
docker compose up -d
```

Bu `localhost:5432`da PostgreSQL'ni ko'taradi (user: `postgres`, parol: `postgres`, DB: `avtotez_guliston`).

To'xtatish uchun: `docker compose down` (ma'lumotlarni saqlab qolish uchun `-v` flagini QO'SHMANG).

## 2. Backend (NestJS)

```
cd backend
cp .env.example .env      # birinchi marta ishlatishda
npm install                # birinchi marta
npm run start:dev
```

API: **http://localhost:3000**

## 3. Frontend (Angular)

```
cd frontend
npm install                # birinchi marta
npx ng serve
```

Sayt: **http://localhost:4200**

## Tekshirish

- Backend ishlayaptimi: `curl http://localhost:3000/questions` → `[]` qaytishi kerak (ma'lumot hali yo'q)
- Frontend ishlayaptimi: brauzerda `http://localhost:4200` oching, "Imtihonni boshlash" tugmasini bosing (hozircha bo'sh ro'yxat chiqadi, chunki savollar bazasi bo'sh)

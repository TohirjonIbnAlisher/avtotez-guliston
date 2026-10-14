# Backend (NestJS) — avtotez.uz serveri uchun.
# Kod va data/ konteynerga /app ichida repo tuzilishi bilan joylashadi:
#   /app/backend  — ilova, /app/data — seed ma'lumotlari (compose'da ulanadi),
#   /app/backend/public — rasm/video/avatar fayllar (compose'da diskka ulanadi, doimiy saqlanadi).

FROM node:22-slim AS build
WORKDIR /app/backend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app/backend
ENV NODE_ENV=production
COPY package*.json ./
# paketlar qayta yuklanmaydi — build bosqichidagidan dev paketlarsiz nusxa
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
EXPOSE 3000
# release-seed: migratsiyalar + data/ o'zgargan bo'lsa seed'lar, keyin server
CMD ["npm", "run", "start:prod"]

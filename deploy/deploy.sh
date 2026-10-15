#!/usr/bin/env bash
# avtotez.uz ni yangilash: serverda /opt/avtotez/app/deploy ichida ishga tushiriladi.
#   ./deploy.sh
# 1) master'dan oxirgi kodni oladi, 2) frontendni (avtotez konfiguratsiyasi) yig'adi,
# 3) backendni qayta yig'ib konteynerlarni yangilaydi. Baza va yuklangan fayllarga tegilmaydi.
# 80/443 ni umumiy proxy-caddy (/opt/proxy) ushlaydi — unga bu skript tegmaydi (qarang: docker-compose.yml).
set -euo pipefail
cd "$(dirname "$0")"

git -C .. pull --ff-only origin master

echo "==> Frontend build"
docker run --rm -v "$(cd ../frontend && pwd)":/app -w /app -e NG_CLI_ANALYTICS=false node:22-slim \
  sh -c "npm ci --no-audit --no-fund && npx ng build --configuration avtotez"

echo "==> Backend + konteynerlar"
# --remove-orphans: eski `web` (Caddy) konteyneri qolgan bo'lsa olib tashlanadi — u 80/443 ni band qilib,
# serverdagi boshqa loyihalarning saytlarini to'xtatib qo'yardi.
docker compose up -d --build --remove-orphans
docker compose ps


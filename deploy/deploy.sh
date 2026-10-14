#!/usr/bin/env bash
# avtotez.uz ni yangilash: serverda /opt/avtotez/app/deploy ichida ishga tushiriladi.
#   ./deploy.sh
# 1) master'dan oxirgi kodni oladi, 2) frontendni (avtotez konfiguratsiyasi) yig'adi,
# 3) backendni qayta yig'ib konteynerlarni yangilaydi. Baza va yuklangan fayllarga tegilmaydi.
set -euo pipefail
cd "$(dirname "$0")"

git -C .. pull --ff-only origin master

echo "==> Frontend build"
docker run --rm -v "$(cd ../frontend && pwd)":/app -w /app -e NG_CLI_ANALYTICS=false node:22-slim \
  sh -c "npm ci --no-audit --no-fund && npx ng build --configuration avtotez"

echo "==> Backend + konteynerlar"
docker compose up -d --build
docker compose ps

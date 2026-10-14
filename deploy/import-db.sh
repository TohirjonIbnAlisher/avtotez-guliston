#!/usr/bin/env bash
# Eski (Render) bazadagi barcha ma'lumotlarni avtotez.uz serveridagi bazaga ko'chiradi.
#   ssh -t root@SERVER /opt/avtotez/app/deploy/import-db.sh
# Eski baza manzili (DATABASE_URL) so'raladi — ekranga chiqmaydi va hech qayerda saqlanmaydi.
# DIQQAT: yangi serverdagi baza to'liq almashtiriladi.
set -euo pipefail
cd "$(dirname "$0")"

read -rsp "Eski baza manzili (DATABASE_URL, postgres://...): " SRC
echo
[ -n "$SRC" ] || { echo "Manzil kiritilmadi."; exit 1; }

# Nusxalashda qo'shilib qolishi mumkin bo'lgan narsalarni tozalash: bo'sh joylar, qo'shtirnoqlar,
# "DATABASE_URL=" yoki "psql " prefiksi. channel_binding parametri olib tashlanadi (sslmode=require qoladi).
CR=$(printf '\r')
SRC=${SRC//$CR/}
SRC=$(printf '%s' "$SRC" | sed -E \
  -e 's/^[[:space:]]+//' \
  -e 's/[[:space:]]+$//' \
  -e 's/^psql[[:space:]]+//' \
  -e 's/^DATABASE_URL=//' \
  -e "s/^[\"']+//" \
  -e "s/[\"']+$//" \
  -e 's/([?&])channel_binding=[^&]*&?/\1/' \
  -e 's/[?&]$//')
case "$SRC" in
  postgres://*|postgresql://*) ;;
  *) echo "Manzil postgres:// yoki postgresql:// bilan boshlanishi kerak."; exit 1 ;;
esac

# pg_dump versiyasi manba serverdan past bo'lmasligi kerak — manba versiyasini aniqlaymiz
MAJOR=$(docker run --rm -e SRC="$SRC" postgres:18-alpine sh -c 'psql "$SRC" -Atc "show server_version_num"' | cut -c1-2)
echo "Manba PostgreSQL versiyasi: $MAJOR"

echo "==> API to'xtatiladi, yangi baza tozalanadi"
docker compose stop api >/dev/null 2>&1 || true
docker compose up -d db
until docker compose exec -T db pg_isready -U avtotez -d avtotez >/dev/null 2>&1; do sleep 1; done
docker compose exec -T db psql -U avtotez -d avtotez -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "==> Ko'chirilmoqda..."
# yangi pg_dump versiyalari qo'shadigan, eski serverda yo'q sozlama satrlari olib tashlanadi
docker run --rm -e SRC="$SRC" "postgres:${MAJOR}-alpine" sh -c 'pg_dump --no-owner --no-acl "$SRC"' \
  | sed -e '/^SET transaction_timeout/d' \
  | docker compose exec -T db psql -U avtotez -d avtotez -q -v ON_ERROR_STOP=1 >/dev/null

docker compose exec -T db psql -U avtotez -d avtotez -Atc \
  "select 'savollar: ' || (select count(*) from questions) || ', foydalanuvchilar: ' || (select count(*) from users) || ', biletlar: ' || (select count(*) from tickets)"

echo "==> API va sayt ishga tushiriladi"
docker compose up -d
echo "Tayyor."

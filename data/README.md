# Ma'lumotlar shablonlari

Bu papkadagi CSV fayllar test savollari va mavzularni tayyorlash uchun shablon hisoblanadi.

> **Diqqat:** `questions_template.csv` ichidagi qatorlar faqat **format namunasi** — ularning matni va raqamlari tekshirilmagan. Haqiqiy savollarni faqat rasmiy/tasdiqlangan manbadan (masalan hamkor avtomaktabning YHXB tomonidan berilgan test bazasi) kiriting.

## `topics_template.csv`

| Ustun | Tavsif |
|---|---|
| `name` | Mavzu nomi (unique) |
| `description` | Qisqa tavsif (ixtiyoriy) |

## `questions_template.csv`

| Ustun | Tavsif |
|---|---|
| `topic` | Mavzu nomi — `topics_template.csv`dagi `name` bilan mos bo'lishi kerak |
| `text` | Savol matni |
| `option_1`...`option_4` | Javob variantlari (kerak bo'lsa ko'proq ustun qo'shish mumkin) |
| `correct_option_number` | To'g'ri javob raqami, **1 dan boshlab** (import paytida 0-based indexga o'giriladi) |
| `image_url` | Agar savol rasm/belgi bilan bog'liq bo'lsa, rasm manzili yoki fayl nomi |
| `explanation` | Nega bu javob to'g'ri ekanligi haqida qisqa tushuntirish |
| `is_tricky` | `TRUE`/`FALSE` — chalg'ituvchi, alohida e'tibor talab qiladigan savolmi |
| `is_number_related` | `TRUE`/`FALSE` — jarima, tezlik, masofa kabi raqamga oid savolmi |

## Keyingi qadam

Fayllar to'ldirilgandan so'ng, backend'ga import qiluvchi skript (`backend`da alohida CLI buyrug'i sifatida) qo'shiladi — bu hozircha rejalashtirilgan, chunki haqiqiy ma'lumotlar hali tayyor emas.

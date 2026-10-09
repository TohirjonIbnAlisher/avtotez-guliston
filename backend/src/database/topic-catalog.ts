// Rasmiy YHQ boblari va ilovalariga mos mavzular ro'yxati (kategoriyalarga guruhlangan).
// Tartib — sahifada ko'rsatilish tartibi (sortOrder), ptest.uz'dagi mavzular tartibi bilan bir xil.
export interface TopicSeed {
  category: string;
  name: string;
  /**
   * Faqat qo'lda kiritilgan savollar (data/custom-questions.json) ko'rsatiladi.
   * assign-topics rasmiy bazadagi savollarni bu mavzuga biriktirmaydi.
   */
  curated?: boolean;
}

export const TOPICS: TopicSeed[] = [
  { category: 'Umumiy qoidalar', name: 'Umumiy qoidalar' },
  { category: 'Umumiy qoidalar', name: 'Haydovchilarning umumiy vazifalari' },
  { category: 'Umumiy qoidalar', name: 'Piyodalarning umumiy vazifalari' },
  { category: 'Umumiy qoidalar', name: 'Maxsus transport vositalarining imtiyozlari' },

  { category: "Yo'l belgilari", name: 'Ogohlantiruvchi belgilar' },
  { category: "Yo'l belgilari", name: 'Imtiyoz belgilari' },
  { category: "Yo'l belgilari", name: 'Taqiqlovchi belgilar' },
  { category: "Yo'l belgilari", name: 'Buyuruvchi belgilar' },
  { category: "Yo'l belgilari", name: "Axborot-ko'rsatkich belgilar" },
  { category: "Yo'l belgilari", name: 'Servis belgilari' },
  { category: "Yo'l belgilari", name: "Qo'shimcha axborot belgilari" },

  { category: 'Ishoralar va chiziqlar', name: 'Yotiq chiziqlar' },
  { category: 'Ishoralar va chiziqlar', name: 'Tik chiziqlar', curated: true },
  { category: 'Ishoralar va chiziqlar', name: 'Svetofor ishoralari' },
  { category: 'Ishoralar va chiziqlar', name: 'Tartibga soluvchining ishoralari' },
  { category: 'Ishoralar va chiziqlar', name: 'Ogohlantiruvchi va avariya ishoralari' },

  { category: 'Asosiy manyovrlar', name: 'Harakatlanishni boshlash, manyovr qilish' },
  {
    category: 'Asosiy manyovrlar',
    name: "Yo'lning qatnov qismida transport vositalarining joylashuvi",
  },
  { category: 'Asosiy manyovrlar', name: 'Harakatlanish tezligi' },
  { category: 'Asosiy manyovrlar', name: "Quvib o'tish" },
  { category: 'Asosiy manyovrlar', name: "To'xtash va to'xtab turish" },

  { category: 'Chorrahalar', name: 'Chorrahalarda harakatlanish' },
  { category: 'Chorrahalar', name: 'Tartibga solingan chorrahalar' },
  {
    category: 'Chorrahalar',
    name: "Tartibga solinmagan chorrahalar (asosiy yo'l to'g'ri yo'nalishda)",
  },
  { category: 'Chorrahalar', name: 'Tartibga solinmagan teng ahamiyatli chorrahalar' },
  {
    category: 'Chorrahalar',
    name: "Tartibga solinmagan chorrahalar (asosiy yo'l yo'nalishi o'zgarishi)",
  },

  {
    category: 'Maxsus vaziyatlar',
    name: "Piyodalar o'tish joylari va yo'nalishli transport vositalari bekatlari",
  },
  { category: 'Maxsus vaziyatlar', name: "Temir yo'l kesishmalari orqali harakatlanish" },
  { category: 'Maxsus vaziyatlar', name: 'Avtomagistrallarda harakatlanish' },
  { category: 'Maxsus vaziyatlar', name: 'Turar joy dahalarida harakatlanish' },
  { category: 'Maxsus vaziyatlar', name: 'Tik balandlik va nishabliklarda harakatlanish' },
  { category: 'Maxsus vaziyatlar', name: "Yo'nalishli transport vositalarining imtiyozlari" },
  { category: 'Maxsus vaziyatlar', name: 'Tashqi yoritish asboblaridan foydalanish' },

  { category: 'Maxsus holatlar va tashish', name: 'Mexanik transport vositalarini shatakka olish' },
  { category: 'Maxsus holatlar va tashish', name: "Transport vositalarini boshqarishni o'rgatish" },
  { category: 'Maxsus holatlar va tashish', name: 'Odam tashish' },
  { category: 'Maxsus holatlar va tashish', name: 'Yuk tashish' },
  {
    category: 'Maxsus holatlar va tashish',
    name: "Velosiped, moped va aravalar harakatlanishiga hamda hayvonlarni haydab o'tishga doir qo'shimcha talablar",
  },

  {
    category: 'Xavfsizlik va yakuniy',
    name: "Mansabdor shaxslarning va fuqarolarning yo'l harakati xavfsizligini ta'minlash, transport vositalarini yo'lga chiqarish, raqam va taniqli belgilarini o'rnatish bo'yicha majburiyatlari",
  },
  {
    category: 'Xavfsizlik va yakuniy',
    name: 'Transport vositalaridan foydalanishni taqiqlovchi shartlar',
  },
  { category: 'Xavfsizlik va yakuniy', name: 'Harakat xavfsizligi asoslari' },
  { category: 'Xavfsizlik va yakuniy', name: 'Birinchi tibbiy yordam' },
];

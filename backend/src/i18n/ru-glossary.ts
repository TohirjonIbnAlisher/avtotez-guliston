// Mavzu va toifalarning rasmiy YHQ (ПДД) atamalariga mos ruscha nomlari.
// Qisqa iboralarni mashina tarjimasi noto'g'ri beradi ("Buyuruvchi belgilar" → "Командирские персонажи"),
// shuning uchun ma'lum nomlar shu lug'atdan olinadi, qolganlari tarjima qilinadi.

const RU_GLOSSARY: Record<string, string> = {
  // toifalar
  'Umumiy qoidalar': 'Общие положения',
  "Yo'l belgilari": 'Дорожные знаки',
  'Ishoralar va chiziqlar': 'Сигналы и разметка',
  'Asosiy manyovrlar': 'Основные манёвры',
  Chorrahalar: 'Перекрёстки',
  'Maxsus vaziyatlar': 'Особые условия движения',
  'Maxsus holatlar va tashish': 'Особые случаи и перевозки',
  'Xavfsizlik va yakuniy': 'Безопасность и заключительные положения',
  // mavzular
  'Haydovchilarning umumiy vazifalari': 'Общие обязанности водителей',
  'Piyodalarning umumiy vazifalari': 'Обязанности пешеходов',
  'Maxsus transport vositalarining imtiyozlari': 'Приоритет транспортных средств специального назначения',
  'Ogohlantiruvchi belgilar': 'Предупреждающие знаки',
  'Imtiyoz belgilari': 'Знаки приоритета',
  'Taqiqlovchi belgilar': 'Запрещающие знаки',
  'Buyuruvchi belgilar': 'Предписывающие знаки',
  "Axborot-ko'rsatkich belgilar": 'Информационно-указательные знаки',
  'Servis belgilari': 'Знаки сервиса',
  "Qo'shimcha axborot belgilari": 'Знаки дополнительной информации (таблички)',
  'Yotiq chiziqlar': 'Горизонтальная разметка',
  'Tik chiziqlar': 'Вертикальная разметка',
  'Svetofor ishoralari': 'Сигналы светофора',
  'Tartibga soluvchining ishoralari': 'Сигналы регулировщика',
  'Ogohlantiruvchi va avariya ishoralari': 'Предупредительные и аварийные сигналы',
  'Harakatlanishni boshlash, manyovr qilish': 'Начало движения, маневрирование',
  "Yo'lning qatnov qismida transport vositalarining joylashuvi": 'Расположение транспортных средств на проезжей части',
  'Harakatlanish tezligi': 'Скорость движения',
  "Quvib o'tish": 'Обгон',
  "To'xtash va to'xtab turish": 'Остановка и стоянка',
  'Chorrahalarda harakatlanish': 'Проезд перекрёстков',
  'Tartibga solingan chorrahalar': 'Регулируемые перекрёстки',
  "Tartibga solinmagan chorrahalar (asosiy yo'l to'g'ri yo'nalishda)":
    'Нерегулируемые перекрёстки (главная дорога идёт прямо)',
  'Tartibga solinmagan teng ahamiyatli chorrahalar': 'Нерегулируемые перекрёстки равнозначных дорог',
  "Tartibga solinmagan chorrahalar (asosiy yo'l yo'nalishi o'zgarishi)":
    'Нерегулируемые перекрёстки (главная дорога меняет направление)',
  "Piyodalar o'tish joylari va yo'nalishli transport vositalari bekatlari":
    'Пешеходные переходы и остановки маршрутных транспортных средств',
  "Temir yo'l kesishmalari orqali harakatlanish": 'Движение через железнодорожные переезды',
  'Avtomagistrallarda harakatlanish': 'Движение по автомагистралям',
  'Turar joy dahalarida harakatlanish': 'Движение в жилых зонах',
  'Tik balandlik va nishabliklarda harakatlanish': 'Движение на крутых подъёмах и спусках',
  "Yo'nalishli transport vositalarining imtiyozlari": 'Приоритет маршрутных транспортных средств',
  'Tashqi yoritish asboblaridan foydalanish': 'Пользование внешними световыми приборами',
  'Mexanik transport vositalarini shatakka olish': 'Буксировка механических транспортных средств',
  "Transport vositalarini boshqarishni o'rgatish": 'Учебная езда',
  'Odam tashish': 'Перевозка людей',
  'Yuk tashish': 'Перевозка грузов',
  "Velosiped, moped va aravalar harakatlanishiga hamda hayvonlarni haydab o'tishga doir qo'shimcha talablar":
    'Дополнительные требования к движению велосипедов, мопедов, гужевых повозок и прогону животных',
  "Mansabdor shaxslarning va fuqarolarning yo'l harakati xavfsizligini ta'minlash, transport vositalarini yo'lga chiqarish, raqam va taniqli belgilarini o'rnatish bo'yicha majburiyatlari":
    'Обязанности должностных лиц и граждан по обеспечению безопасности дорожного движения, допуску транспортных средств к эксплуатации и установке номерных и опознавательных знаков',
  'Transport vositalaridan foydalanishni taqiqlovchi shartlar': 'Условия, запрещающие эксплуатацию транспортных средств',
  'Harakat xavfsizligi asoslari': 'Основы безопасности движения',
  'Birinchi tibbiy yordam': 'Первая медицинская помощь',
};

const normalize = (text: string) =>
  text
    .replace(/[ʻʼ‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
const BY_KEY = new Map(Object.entries(RU_GLOSSARY).map(([uz, ru]) => [normalize(uz), ru]));

/** Ibora lug'atda bo'lsa — uning rasmiy ruscha nomi. */
export function glossaryRu(uz: string | null | undefined): string | undefined {
  return uz ? BY_KEY.get(normalize(uz)) : undefined;
}

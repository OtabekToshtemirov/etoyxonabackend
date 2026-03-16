import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'itoyxona',
  synchronize: false,
});

async function seedServices() {
  console.log('🌱 Xizmatlar seed boshlandi...');

  await dataSource.initialize();
  console.log('✅ Database ulanish muvaffaqiyatli');

  const queryRunner = dataSource.createQueryRunner();

  // 1. Kategoriyalar yaratish
  const categories = [
    { name: 'Ovqatlanish', name_ru: 'Питание', description: 'Taom va ichimliklar', icon: 'utensils', sort_order: 1 },
    { name: 'Bezatish', name_ru: 'Декорация', description: 'Zal va joy bezatish', icon: 'palette', sort_order: 2 },
    { name: 'Musiqa va ko\'ngil ochar', name_ru: 'Музыка и развлечения', description: 'DJ, jonli musiqa, boshlovchi', icon: 'music', sort_order: 3 },
    { name: 'Foto va video', name_ru: 'Фото и видео', description: 'Suratga olish va videosyomka', icon: 'camera', sort_order: 4 },
    { name: 'Transport', name_ru: 'Транспорт', description: 'Mashina ijarasi va transport xizmatlari', icon: 'car', sort_order: 5 },
    { name: 'Gullar', name_ru: 'Цветы', description: 'Guldasta va gul bezaklar', icon: 'flower', sort_order: 6 },
    { name: 'Boshqa xizmatlar', name_ru: 'Прочие услуги', description: 'Qo\'shimcha xizmatlar', icon: 'star', sort_order: 7 },
  ];

  const categoryIds: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await queryRunner.query(
      `SELECT id FROM service_categories WHERE name = $1`,
      [cat.name],
    );

    if (existing.length > 0) {
      categoryIds[cat.name] = existing[0].id;
      console.log(`⏭️  Kategoriya "${cat.name}" allaqachon mavjud`);
    } else {
      const result = await queryRunner.query(
        `INSERT INTO service_categories (name, name_ru, description, icon, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [cat.name, cat.name_ru, cat.description, cat.icon, cat.sort_order],
      );
      categoryIds[cat.name] = result[0].id;
      console.log(`✅ Kategoriya yaratildi: ${cat.name}`);
    }
  }

  // 2. Venue topish (birinchi venue)
  const venues = await queryRunner.query(`SELECT id, name FROM venues LIMIT 5`);
  if (venues.length === 0) {
    console.log('❌ Hech qanday venue topilmadi. Avval venue yarating.');
    await queryRunner.release();
    await dataSource.destroy();
    return;
  }

  console.log(`\n📍 Topilgan venue(lar): ${venues.map((v: { name: string }) => v.name).join(', ')}`);

  // 3. Har bir venue uchun xizmatlar yaratish
  for (const venue of venues) {
    console.log(`\n🏢 "${venue.name}" uchun xizmatlar qo'shilmoqda...`);

    const services = [
      // Ovqatlanish
      { category: 'Ovqatlanish', name: 'Milliy taomlar (1 kishi)', pricing_type: 'per_person', price: 120000, description: 'Osh, kabob, sho\'rva, salat va shirinliklar' },
      { category: 'Ovqatlanish', name: 'Yevropacha taomlar (1 kishi)', pricing_type: 'per_person', price: 150000, description: 'Salat, issiq taom, garnir, desert' },
      { category: 'Ovqatlanish', name: 'VIP menyu (1 kishi)', pricing_type: 'per_person', price: 250000, description: 'Premium taomlar to\'plami' },
      { category: 'Ovqatlanish', name: 'Choy-shirinlik xizmati', pricing_type: 'fixed', price: 2000000, description: 'Choy, qahva, shirinliklar va pishiriqlar' },
      { category: 'Ovqatlanish', name: 'Tort (1 kg)', pricing_type: 'per_unit', price: 200000, description: 'Buyurtma asosida tayyorlanadigan tort' },

      // Bezatish
      { category: 'Bezatish', name: 'Standart zal bezatish', pricing_type: 'fixed', price: 5000000, description: 'Mashina sharlar, lenta va parda bezaklar' },
      { category: 'Bezatish', name: 'Premium zal bezatish', pricing_type: 'fixed', price: 15000000, description: 'Gul arki, shamdonlar, maxsus yoritish' },
      { category: 'Bezatish', name: 'LED ekran ijarasi', pricing_type: 'fixed', price: 3000000, description: 'Katta LED ekran va slayd-shou' },
      { category: 'Bezatish', name: 'Balon kompozitsiya', pricing_type: 'fixed', price: 1500000, description: 'Sharlardan kompozitsiya' },

      // Musiqa va ko'ngil ochar
      { category: 'Musiqa va ko\'ngil ochar', name: 'DJ xizmati', pricing_type: 'fixed', price: 3000000, description: 'Professional DJ va musiqa apparaturasi' },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Jonli musiqa (guruh)', pricing_type: 'fixed', price: 8000000, description: '3-5 kishilik jonli musiqa guruhi' },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Boshlovchi (tamada)', pricing_type: 'fixed', price: 5000000, description: 'Professional boshlovchi' },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Raqs guruhi', pricing_type: 'fixed', price: 4000000, description: 'Professional raqqosalar guruhi' },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Otashin shou', pricing_type: 'fixed', price: 2500000, description: 'Feyerverklar va otashin namoyishi' },

      // Foto va video
      { category: 'Foto va video', name: 'Fotograf (1 kun)', pricing_type: 'fixed', price: 3000000, description: 'Professional fotograf, 500+ ta surat' },
      { category: 'Foto va video', name: 'Videograf (1 kun)', pricing_type: 'fixed', price: 5000000, description: 'Professional videosyomka va montaj' },
      { category: 'Foto va video', name: 'Foto + Video paket', pricing_type: 'fixed', price: 7000000, description: 'Fotograf + videograf kompleksi' },
      { category: 'Foto va video', name: 'Dron syomka', pricing_type: 'fixed', price: 2000000, description: 'Havoda dron bilan suratga olish' },
      { category: 'Foto va video', name: 'Fotozona', pricing_type: 'fixed', price: 1500000, description: 'Maxsus bezatilgan suratga tushish joyi' },

      // Transport
      { category: 'Transport', name: 'Kelin mashinasi (oq)', pricing_type: 'fixed', price: 3000000, description: 'Oq mersedes yoki BMW' },
      { category: 'Transport', name: 'Kortej (5 ta mashina)', pricing_type: 'fixed', price: 8000000, description: '5 ta bir xil mashina kortej' },
      { category: 'Transport', name: 'Mehmonlar uchun avtobus', pricing_type: 'fixed', price: 4000000, description: '50 o\'rinli avtobus' },

      // Gullar
      { category: 'Gullar', name: 'Kelin guldastasi', pricing_type: 'fixed', price: 500000, description: 'Kelin uchun maxsus guldasta' },
      { category: 'Gullar', name: 'Gul arki', pricing_type: 'fixed', price: 3000000, description: 'Kirish uchun gul arki' },
      { category: 'Gullar', name: 'Stol gullar (1 dona)', pricing_type: 'per_unit', price: 150000, description: 'Har bir stol uchun gul kompozitsiya' },

      // Boshqa
      { category: 'Boshqa xizmatlar', name: 'Garderob xizmati', pricing_type: 'fixed', price: 1000000, description: 'Mehmonlar kiyimlari uchun garderob' },
      { category: 'Boshqa xizmatlar', name: 'Bolalar xonasi', pricing_type: 'fixed', price: 2000000, description: 'Bolalar uchun o\'yin xonasi va tarbiyachi' },
      { category: 'Boshqa xizmatlar', name: 'Valet parking', pricing_type: 'fixed', price: 1500000, description: 'Mehmonlar mashinalarini parkovka qilish' },
      { category: 'Boshqa xizmatlar', name: 'Qo\'riqlash xizmati', pricing_type: 'fixed', price: 2000000, description: '2 ta professional qo\'riqchi' },
      { category: 'Boshqa xizmatlar', name: 'Tibbiy yordam punkti', pricing_type: 'fixed', price: 1000000, description: 'Hamshira va birinchi yordam' },
    ];

    for (const svc of services) {
      const catId = categoryIds[svc.category];
      if (!catId) {
        console.log(`⚠️  Kategoriya topilmadi: ${svc.category}`);
        continue;
      }

      // Tekshirish
      const existing = await queryRunner.query(
        `SELECT id FROM venue_services WHERE venue_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [venue.id, svc.name],
      );

      if (existing.length > 0) {
        console.log(`  ⏭️  "${svc.name}" allaqachon mavjud`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO venue_services (venue_id, category_id, name, description, pricing_type, price, price_currency, is_available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, 'UZS', true, 0)`,
        [venue.id, catId, svc.name, svc.description, svc.pricing_type, svc.price],
      );
      console.log(`  ✅ "${svc.name}" — ${svc.price.toLocaleString()} so'm`);
    }
  }

  await queryRunner.release();

  console.log('\n📊 Yaratilgan xizmatlar:');
  console.log('┌──────────────────────────────────────────────────┐');
  console.log('│  Kategoriya              │  Xizmatlar soni       │');
  console.log('├──────────────────────────────────────────────────┤');
  console.log('│  Ovqatlanish             │  5 ta                 │');
  console.log('│  Bezatish                │  4 ta                 │');
  console.log('│  Musiqa va ko\'ngil ochar │  5 ta                 │');
  console.log('│  Foto va video           │  5 ta                 │');
  console.log('│  Transport               │  3 ta                 │');
  console.log('│  Gullar                  │  3 ta                 │');
  console.log('│  Boshqa xizmatlar        │  5 ta                 │');
  console.log('│  ─────────────────────── │  ──────               │');
  console.log('│  JAMI                    │  30 ta                │');
  console.log('└──────────────────────────────────────────────────┘');

  await dataSource.destroy();
  console.log('\n🎉 Xizmatlar seed muvaffaqiyatli tugadi!');
}

seedServices().catch((err) => {
  console.error('❌ Seed xatolik:', err);
  process.exit(1);
});

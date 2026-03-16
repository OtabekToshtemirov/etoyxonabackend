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

async function seedMenuAndServices() {
  console.log('🌱 Menyu va xizmatlar seed boshlandi...');

  await dataSource.initialize();
  console.log('✅ Database ulanish muvaffaqiyatli');

  const qr = dataSource.createQueryRunner();

  // ═══════════════════════════════════════════
  // 1. XIZMAT KATEGORIYALARI
  // ═══════════════════════════════════════════
  const serviceCategories = [
    { name: 'Ovqatlanish', name_ru: 'Питание', description: 'Taom va ichimliklar', icon: 'utensils', sort_order: 1 },
    { name: 'Bezatish', name_ru: 'Декорация', description: 'Zal va joy bezatish', icon: 'palette', sort_order: 2 },
    { name: 'Musiqa va ko\'ngil ochar', name_ru: 'Музыка и развлечения', description: 'DJ, jonli musiqa, boshlovchi', icon: 'music', sort_order: 3 },
    { name: 'Foto va video', name_ru: 'Фото и видео', description: 'Suratga olish va videosyomka', icon: 'camera', sort_order: 4 },
    { name: 'Transport', name_ru: 'Транспорт', description: 'Mashina ijarasi va transport', icon: 'car', sort_order: 5 },
    { name: 'Gullar', name_ru: 'Цветы', description: 'Guldasta va gul bezaklar', icon: 'flower', sort_order: 6 },
    { name: 'Boshqa xizmatlar', name_ru: 'Прочие услуги', description: 'Qo\'shimcha xizmatlar', icon: 'star', sort_order: 7 },
  ];

  const serviceCatIds: Record<string, string> = {};
  for (const cat of serviceCategories) {
    const existing = await qr.query(`SELECT id FROM service_categories WHERE name = $1`, [cat.name]);
    if (existing.length > 0) {
      serviceCatIds[cat.name] = existing[0].id;
      console.log(`⏭️  Xizmat kat: "${cat.name}" mavjud`);
    } else {
      const r = await qr.query(
        `INSERT INTO service_categories (name, name_ru, description, icon, sort_order, is_active) VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
        [cat.name, cat.name_ru, cat.description, cat.icon, cat.sort_order],
      );
      serviceCatIds[cat.name] = r[0].id;
      console.log(`✅ Xizmat kat: "${cat.name}"`);
    }
  }

  // ═══════════════════════════════════════════
  // 2. VENUE TOPISH
  // ═══════════════════════════════════════════
  const venues = await qr.query(`SELECT id, name FROM venues LIMIT 5`);
  if (venues.length === 0) {
    console.log('❌ Hech qanday venue topilmadi. Avval venue yarating.');
    await qr.release();
    await dataSource.destroy();
    return;
  }
  console.log(`\n📍 Venue(lar): ${venues.map((v: { name: string }) => v.name).join(', ')}`);

  for (const venue of venues) {
    console.log(`\n🏢 "${venue.name}" uchun seed...\n`);

    // ═══════════════════════════════════════════
    // 3. MENYU KATEGORIYALARI
    // ═══════════════════════════════════════════
    const menuCategories = [
      { name: 'Salatlar', description: 'Turli salatlar', sort_order: 1 },
      { name: 'Sho\'rvalar', description: 'Issiq sho\'rvalar', sort_order: 2 },
      { name: 'Asosiy taomlar', description: 'Asosiy issiq taomlar', sort_order: 3 },
      { name: 'Kaboblar', description: 'Kabob turlari', sort_order: 4 },
      { name: 'Non va yonbosh', description: 'Non, lepyoshka', sort_order: 5 },
      { name: 'Shirinliklar', description: 'Desert va shirinliklar', sort_order: 6 },
      { name: 'Ichimliklar', description: 'Sovuq va issiq ichimliklar', sort_order: 7 },
    ];

    const menuCatIds: Record<string, string> = {};
    for (const cat of menuCategories) {
      const existing = await qr.query(
        `SELECT id FROM menu_categories WHERE venue_id = $1 AND name = $2`,
        [venue.id, cat.name],
      );
      if (existing.length > 0) {
        menuCatIds[cat.name] = existing[0].id;
      } else {
        const r = await qr.query(
          `INSERT INTO menu_categories (venue_id, name, description, sort_order, is_active) VALUES ($1,$2,$3,$4,true) RETURNING id`,
          [venue.id, cat.name, cat.description, cat.sort_order],
        );
        menuCatIds[cat.name] = r[0].id;
        console.log(`  📂 Menyu kat: "${cat.name}"`);
      }
    }

    // ═══════════════════════════════════════════
    // 4. MENYU ITEMLAR
    // ═══════════════════════════════════════════
    const menuItems = [
      { category: 'Salatlar', name: 'Olivye salatasi', price: 25000 },
      { category: 'Salatlar', name: 'Sezar salatasi', price: 30000 },
      { category: 'Salatlar', name: 'Achichuk', price: 15000 },
      { category: 'Salatlar', name: 'Vinegret', price: 20000 },
      { category: 'Sho\'rvalar', name: 'Mastava', price: 25000 },
      { category: 'Sho\'rvalar', name: 'Lag\'mon', price: 30000 },
      { category: 'Sho\'rvalar', name: 'Shorpa', price: 28000 },
      { category: 'Asosiy taomlar', name: 'Osh (palov)', price: 35000 },
      { category: 'Asosiy taomlar', name: 'Norin', price: 30000 },
      { category: 'Asosiy taomlar', name: 'Manti', price: 28000 },
      { category: 'Asosiy taomlar', name: 'Chuchvara', price: 25000 },
      { category: 'Asosiy taomlar', name: 'Dimlama', price: 32000 },
      { category: 'Kaboblar', name: 'Qo\'y kabob', price: 40000 },
      { category: 'Kaboblar', name: 'Tovuq kabob', price: 30000 },
      { category: 'Kaboblar', name: 'Lyulya kabob', price: 35000 },
      { category: 'Kaboblar', name: 'Jigar kabob', price: 32000 },
      { category: 'Non va yonbosh', name: 'Obi non', price: 5000 },
      { category: 'Non va yonbosh', name: 'Patir non', price: 8000 },
      { category: 'Non va yonbosh', name: 'Somsa', price: 12000 },
      { category: 'Shirinliklar', name: 'Tort (1 bo\'lak)', price: 25000 },
      { category: 'Shirinliklar', name: 'Paxlava', price: 20000 },
      { category: 'Shirinliklar', name: 'Mevalar', price: 15000 },
      { category: 'Shirinliklar', name: 'Halvaitar', price: 18000 },
      { category: 'Ichimliklar', name: 'Ko\'k choy', price: 5000 },
      { category: 'Ichimliklar', name: 'Qora choy', price: 5000 },
      { category: 'Ichimliklar', name: 'Kompot', price: 10000 },
      { category: 'Ichimliklar', name: 'Mineral suv', price: 8000 },
      { category: 'Ichimliklar', name: 'Limonad', price: 12000 },
    ];

    const menuItemIds: Record<string, string> = {};
    for (const item of menuItems) {
      const catId = menuCatIds[item.category];
      if (!catId) continue;
      const existing = await qr.query(
        `SELECT id FROM menu_items WHERE venue_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [venue.id, item.name],
      );
      if (existing.length > 0) {
        menuItemIds[item.name] = existing[0].id;
      } else {
        const r = await qr.query(
          `INSERT INTO menu_items (venue_id, category_id, name, price_per_person, price_currency, unit, is_available, sort_order) VALUES ($1,$2,$3,$4,'UZS','person',true,0) RETURNING id`,
          [venue.id, catId, item.name, item.price],
        );
        menuItemIds[item.name] = r[0].id;
        console.log(`  🍽️  "${item.name}" — ${item.price.toLocaleString()} so'm`);
      }
    }

    // ═══════════════════════════════════════════
    // 5. MENYU PAKETLAR
    // ═══════════════════════════════════════════
    const packages = [
      {
        name: 'Ekonom paket',
        description: 'Asosiy taomlar to\'plami',
        price_per_person: 120000,
        tier: 'economy',
        min_guests: 50,
        sort_order: 1,
        items: ['Achichuk', 'Mastava', 'Osh (palov)', 'Obi non', 'Ko\'k choy', 'Mevalar'],
      },
      {
        name: 'Standart paket',
        description: 'Kengaytirilgan taomlar to\'plami',
        price_per_person: 180000,
        tier: 'standard',
        min_guests: 50,
        sort_order: 2,
        items: ['Olivye salatasi', 'Achichuk', 'Mastava', 'Osh (palov)', 'Tovuq kabob', 'Obi non', 'Patir non', 'Ko\'k choy', 'Kompot', 'Mevalar', 'Paxlava'],
      },
      {
        name: 'Premium paket',
        description: 'Yuqori sifatli to\'liq menyu',
        price_per_person: 250000,
        tier: 'premium',
        min_guests: 100,
        sort_order: 3,
        items: ['Olivye salatasi', 'Sezar salatasi', 'Achichuk', 'Lag\'mon', 'Osh (palov)', 'Norin', 'Qo\'y kabob', 'Lyulya kabob', 'Obi non', 'Patir non', 'Somsa', 'Ko\'k choy', 'Kompot', 'Limonad', 'Mevalar', 'Paxlava', 'Tort (1 bo\'lak)'],
      },
      {
        name: 'VIP paket',
        description: 'Eng yuqori darajadagi ziyofat menyusi',
        price_per_person: 350000,
        tier: 'vip',
        min_guests: 100,
        sort_order: 4,
        items: ['Olivye salatasi', 'Sezar salatasi', 'Vinegret', 'Achichuk', 'Mastava', 'Lag\'mon', 'Osh (palov)', 'Norin', 'Manti', 'Dimlama', 'Qo\'y kabob', 'Tovuq kabob', 'Lyulya kabob', 'Jigar kabob', 'Obi non', 'Patir non', 'Somsa', 'Ko\'k choy', 'Qora choy', 'Kompot', 'Limonad', 'Mineral suv', 'Mevalar', 'Paxlava', 'Halvaitar', 'Tort (1 bo\'lak)'],
      },
    ];

    for (const pkg of packages) {
      const existing = await qr.query(
        `SELECT id FROM menu_packages WHERE venue_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [venue.id, pkg.name],
      );
      let pkgId: string;
      if (existing.length > 0) {
        pkgId = existing[0].id;
        console.log(`  ⏭️  Paket "${pkg.name}" mavjud`);
      } else {
        const r = await qr.query(
          `INSERT INTO menu_packages (venue_id, name, description, price_per_person, price_currency, tier, min_guests, is_active, is_popular, sort_order)
           VALUES ($1,$2,$3,$4,'UZS',$5,$6,true,$7,$8) RETURNING id`,
          [venue.id, pkg.name, pkg.description, pkg.price_per_person, pkg.tier, pkg.min_guests, pkg.tier === 'standard', pkg.sort_order],
        );
        pkgId = r[0].id;
        console.log(`  📦 Paket: "${pkg.name}" — ${pkg.price_per_person.toLocaleString()} so'm/kishi`);
      }

      // Paket itemlari
      for (const itemName of pkg.items) {
        const itemId = menuItemIds[itemName];
        if (!itemId) continue;
        const existingLink = await qr.query(
          `SELECT id FROM menu_package_items WHERE package_id = $1 AND menu_item_id = $2`,
          [pkgId, itemId],
        );
        if (existingLink.length === 0) {
          await qr.query(
            `INSERT INTO menu_package_items (package_id, menu_item_id, quantity, is_optional, sort_order) VALUES ($1,$2,1,false,0)`,
            [pkgId, itemId],
          );
        }
      }
    }

    // ═══════════════════════════════════════════
    // 6. VENUE XIZMATLAR
    // ═══════════════════════════════════════════
    const venueServices = [
      { category: 'Ovqatlanish', name: 'Choy-shirinlik xizmati', pricing_type: 'fixed', price: 2000000 },
      { category: 'Ovqatlanish', name: 'Tort (1 kg)', pricing_type: 'per_unit', price: 200000 },
      { category: 'Bezatish', name: 'Standart zal bezatish', pricing_type: 'fixed', price: 5000000 },
      { category: 'Bezatish', name: 'Premium zal bezatish', pricing_type: 'fixed', price: 15000000 },
      { category: 'Bezatish', name: 'LED ekran ijarasi', pricing_type: 'fixed', price: 3000000 },
      { category: 'Bezatish', name: 'Balon kompozitsiya', pricing_type: 'fixed', price: 1500000 },
      { category: 'Musiqa va ko\'ngil ochar', name: 'DJ xizmati', pricing_type: 'fixed', price: 3000000 },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Jonli musiqa (guruh)', pricing_type: 'fixed', price: 8000000 },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Boshlovchi (tamada)', pricing_type: 'fixed', price: 5000000 },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Raqs guruhi', pricing_type: 'fixed', price: 4000000 },
      { category: 'Musiqa va ko\'ngil ochar', name: 'Otashin shou', pricing_type: 'fixed', price: 2500000 },
      { category: 'Foto va video', name: 'Fotograf (1 kun)', pricing_type: 'fixed', price: 3000000 },
      { category: 'Foto va video', name: 'Videograf (1 kun)', pricing_type: 'fixed', price: 5000000 },
      { category: 'Foto va video', name: 'Foto + Video paket', pricing_type: 'fixed', price: 7000000 },
      { category: 'Foto va video', name: 'Dron syomka', pricing_type: 'fixed', price: 2000000 },
      { category: 'Foto va video', name: 'Fotozona', pricing_type: 'fixed', price: 1500000 },
      { category: 'Transport', name: 'Kelin mashinasi (oq)', pricing_type: 'fixed', price: 3000000 },
      { category: 'Transport', name: 'Kortej (5 mashina)', pricing_type: 'fixed', price: 8000000 },
      { category: 'Transport', name: 'Mehmon avtobusi', pricing_type: 'fixed', price: 4000000 },
      { category: 'Gullar', name: 'Kelin guldastasi', pricing_type: 'fixed', price: 500000 },
      { category: 'Gullar', name: 'Gul arki', pricing_type: 'fixed', price: 3000000 },
      { category: 'Gullar', name: 'Stol gullari (1 dona)', pricing_type: 'per_unit', price: 150000 },
      { category: 'Boshqa xizmatlar', name: 'Garderob xizmati', pricing_type: 'fixed', price: 1000000 },
      { category: 'Boshqa xizmatlar', name: 'Bolalar xonasi', pricing_type: 'fixed', price: 2000000 },
      { category: 'Boshqa xizmatlar', name: 'Valet parking', pricing_type: 'fixed', price: 1500000 },
      { category: 'Boshqa xizmatlar', name: 'Qo\'riqlash xizmati', pricing_type: 'fixed', price: 2000000 },
      { category: 'Boshqa xizmatlar', name: 'Tibbiy yordam', pricing_type: 'fixed', price: 1000000 },
    ];

    for (const svc of venueServices) {
      const catId = serviceCatIds[svc.category];
      if (!catId) continue;
      const existing = await qr.query(
        `SELECT id FROM venue_services WHERE venue_id = $1 AND name = $2 AND deleted_at IS NULL`,
        [venue.id, svc.name],
      );
      if (existing.length === 0) {
        await qr.query(
          `INSERT INTO venue_services (venue_id, category_id, name, pricing_type, price, price_currency, is_available, sort_order) VALUES ($1,$2,$3,$4,$5,'UZS',true,0)`,
          [venue.id, catId, svc.name, svc.pricing_type, svc.price],
        );
        console.log(`  🔧 "${svc.name}" — ${svc.price.toLocaleString()} so'm`);
      } else {
        console.log(`  ⏭️  "${svc.name}" mavjud`);
      }
    }
  }

  await qr.release();

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Yaratilgan ma\'lumotlar:');
  console.log('  📂 7 ta xizmat kategoriyasi');
  console.log('  📂 7 ta menyu kategoriyasi');
  console.log('  🍽️  28 ta menyu taom');
  console.log('  📦 4 ta menyu paket (Ekonom/Standart/Premium/VIP)');
  console.log('  🔧 27 ta qo\'shimcha xizmat');
  console.log('═══════════════════════════════════════════');

  await dataSource.destroy();
  console.log('\n🎉 Seed muvaffaqiyatli tugadi!');
}

seedMenuAndServices().catch((err) => {
  console.error('❌ Seed xatolik:', err);
  process.exit(1);
});

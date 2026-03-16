import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
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

async function seed() {
  console.log('🌱 Seed boshlandi...');

  await dataSource.initialize();
  console.log('✅ Database ulanish muvaffaqiyatli');

  const queryRunner = dataSource.createQueryRunner();

  // Test user ma'lumotlari
  const testUsers = [
    {
      phone: '+998901234567',
      password: 'test1234',
      full_name: 'Test Foydalanuvchi',
      email: 'test@itoyxona.uz',
      role: 'owner',
      status: 'active',
      language: 'uz',
    },
    {
      phone: '+998911111111',
      password: 'admin1234',
      full_name: 'Admin User',
      email: 'admin@itoyxona.uz',
      role: 'super_admin',
      status: 'active',
      language: 'uz',
    },
    {
      phone: '+998922222222',
      password: 'client1234',
      full_name: 'Mijoz Testov',
      email: 'client@itoyxona.uz',
      role: 'client',
      status: 'active',
      language: 'uz',
    },
  ];

  for (const testUser of testUsers) {
    // Tekshirish: user allaqachon mavjudmi
    const existing = await queryRunner.query(
      `SELECT id FROM users WHERE phone = $1`,
      [testUser.phone],
    );

    if (existing.length > 0) {
      console.log(`⏭️  User "${testUser.full_name}" (${testUser.phone}) allaqachon mavjud`);
      continue;
    }

    const passwordHash = await bcrypt.hash(testUser.password, 12);

    await queryRunner.query(
      `INSERT INTO users (phone, password_hash, full_name, email, role, status, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testUser.phone, passwordHash, testUser.full_name, testUser.email, testUser.role, testUser.status, testUser.language],
    );

    console.log(`✅ User yaratildi: ${testUser.full_name} (${testUser.phone}) | parol: ${testUser.password}`);
  }

  await queryRunner.release();

  console.log('\n📋 Test foydalanuvchilar:');
  console.log('┌──────────────────────────────────────────────────────┐');
  console.log('│  Telefon          │  Parol       │  Role            │');
  console.log('├──────────────────────────────────────────────────────┤');
  console.log('│  +998901234567    │  test1234    │  owner           │');
  console.log('│  +998911111111    │  admin1234   │  super_admin     │');
  console.log('│  +998922222222    │  client1234  │  client          │');
  console.log('└──────────────────────────────────────────────────────┘');

  await dataSource.destroy();
  console.log('\n🎉 Seed muvaffaqiyatli tugadi!');
}

seed().catch((err) => {
  console.error('❌ Seed xatolik:', err);
  process.exit(1);
});

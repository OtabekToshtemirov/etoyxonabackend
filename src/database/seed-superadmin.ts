/**
 * Production superadmin seed script.
 * Reads credentials from environment variables — never hardcodes them.
 *
 * Required env vars:
 *   SUPERADMIN_PHONE    — e.g. +998901234567
 *   SUPERADMIN_PASSWORD — strong password
 *
 * Optional env vars:
 *   SUPERADMIN_FULLNAME — defaults to "Super Admin"
 *   SUPERADMIN_EMAIL    — optional email
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/database/seed-superadmin.ts
 *   or via npm script:
 *   npm run seed:superadmin
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

// --- Validate required env vars before touching the DB ---
const phone = process.env.SUPERADMIN_PHONE as string;
const password = process.env.SUPERADMIN_PASSWORD as string;

if (!phone || !password) {
  console.error('❌ SUPERADMIN_PHONE va SUPERADMIN_PASSWORD env o\'zgaruvchilari talab qilinadi.');
  console.error('   Misol: SUPERADMIN_PHONE=+998901234567 SUPERADMIN_PASSWORD=StrongPass123! npm run seed:superadmin');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ SUPERADMIN_PASSWORD kamida 8 ta belgidan iborat bo\'lishi kerak.');
  process.exit(1);
}

const fullName = process.env.SUPERADMIN_FULLNAME || 'Super Admin';
const email = process.env.SUPERADMIN_EMAIL || null;

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'itoyxona',
  synchronize: false,
});

async function seedSuperAdmin() {
  console.log('🌱 Superadmin seed boshlandi...');

  await dataSource.initialize();
  console.log('✅ Database ulanish muvaffaqiyatli');

  const queryRunner = dataSource.createQueryRunner();

  try {
    // Check if superadmin already exists for this phone
    const existing = await queryRunner.query(
      `SELECT id, role FROM users WHERE phone = $1`,
      [phone],
    );

    if (existing.length > 0) {
      if (existing[0].role === 'super_admin') {
        console.log(`⏭️  Superadmin (${phone}) allaqachon mavjud. Hech narsa o'zgarmadi.`);
      } else {
        console.error(`❌ Bu telefon raqam (${phone}) boshqa rol bilan ro'yxatdan o'tgan: ${existing[0].role}`);
        console.error('   Boshqa telefon raqam tanlang yoki mavjud foydalanuvchini qo\'lda o\'zgartiring.');
        process.exit(1);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await queryRunner.query(
      `INSERT INTO users (phone, password_hash, full_name, email, role, status, language)
       VALUES ($1, $2, $3, $4, 'super_admin', 'active', 'uz')`,
      [phone, passwordHash, fullName, email],
    );

    console.log('');
    console.log('✅ Superadmin muvaffaqiyatli yaratildi!');
    console.log('┌─────────────────────────────────────────┐');
    console.log(`│  Telefon : ${phone.padEnd(29)}│`);
    console.log(`│  Ism     : ${fullName.substring(0, 29).padEnd(29)}│`);
    console.log(`│  Rol     : super_admin                  │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('⚠️  Parolni xavfsiz joyda saqlang!');
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedSuperAdmin().catch((err) => {
  console.error('❌ Seed xatolik:', err.message || err);
  process.exit(1);
});

import { DataSource, EntityManager } from 'typeorm';

/**
 * Atomic sequence helpers — Postgres SEQUENCE based number generators.
 *
 * Why: ORDER BY createdAt DESC + 1 is not race-safe. Two parallel inserts
 * can read the same "last" row and both compute n+1 → UNIQUE violation.
 * Postgres SEQUENCE returns a unique number per nextval() call, atomically.
 *
 * Sequences are auto-created at module init via ensureSequencesExist().
 */

export async function ensureSequencesExist(ds: DataSource): Promise<void> {
  // One global sequence per number type. Per-tenant sequences would require
  // dynamic CREATE SEQUENCE per venue — overkill. Numbers are still unique
  // and human-readable; tenant scoping is enforced by the venue_id column.
  await ds.query(`CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1`);
  await ds.query(`CREATE SEQUENCE IF NOT EXISTS payment_number_seq START 1`);
  await ds.query(`CREATE SEQUENCE IF NOT EXISTS refund_number_seq START 1`);
}

async function nextval(
  manager: EntityManager | DataSource,
  seqName: string,
): Promise<number> {
  const rows = await manager.query(`SELECT nextval($1) AS n`, [seqName]);
  return Number(rows[0].n);
}

export async function nextBookingNumber(
  manager: EntityManager | DataSource,
): Promise<string> {
  const year = new Date().getFullYear();
  const n = await nextval(manager, 'booking_number_seq');
  return `BK-${year}-${String(n).padStart(5, '0')}`;
}

export async function nextPaymentNumber(
  manager: EntityManager | DataSource,
): Promise<string> {
  const year = new Date().getFullYear();
  const n = await nextval(manager, 'payment_number_seq');
  return `PAY-${year}-${String(n).padStart(5, '0')}`;
}

export async function nextRefundNumber(
  manager: EntityManager | DataSource,
): Promise<string> {
  const year = new Date().getFullYear();
  const n = await nextval(manager, 'refund_number_seq');
  return `REF-${year}-${String(n).padStart(5, '0')}`;
}

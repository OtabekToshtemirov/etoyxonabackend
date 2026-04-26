/**
 * Normalize Uzbek phone numbers to canonical +998XXXXXXXXX form.
 *
 * Accepts variations:
 *   "+998 90 123-45-67"  → "+998901234567"
 *   "998901234567"        → "+998901234567"
 *   "8901234567"          → "+998901234567" (assume UZ if 9 digits)
 *   "901234567"           → "+998901234567"
 *
 * Storing/lookup must always use this normalized form to avoid duplicates.
 */
export function normalizePhone(input?: string | null): string {
  if (!input) return '';
  // Strip everything except digits and leading +
  let s = String(input).trim();
  const hasPlus = s.startsWith('+');
  s = s.replace(/\D+/g, '');

  if (!s) return '';

  // 998XXXXXXXXX (12 digits) — already country-coded
  if (s.length === 12 && s.startsWith('998')) {
    return '+' + s;
  }
  // 13 digits with leading + → 998XXXXXXXXX
  if (hasPlus && s.length === 12 && s.startsWith('998')) {
    return '+' + s;
  }
  // 9 digits → assume Uzbekistan, add 998
  if (s.length === 9) {
    return '+998' + s;
  }
  // 10 digits starting with 8 (legacy national) → strip 8, add 998
  if (s.length === 10 && s.startsWith('8')) {
    return '+998' + s.slice(1);
  }
  // Fallback — return what we have, prefixed with +
  return hasPlus ? '+' + s : s;
}

/**
 * Loose validation for Uzbek mobile phones.
 */
export function isValidUzPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^\+998\d{9}$/.test(normalized);
}

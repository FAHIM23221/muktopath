// সাধারণ হেল্পার — JSON রেসপন্স, ভ্যালিডেশন, স্লাগ/কোড তৈরি

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

export function error(message, status = 400) {
  return json({ ok: false, error: message }, status);
}

export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

// স্ট্রিং পরিষ্কার + দৈর্ঘ্য সীমা
export function clean(value, max = 500) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

export function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
}

// Trx ID: সাধারণত ৮–১৬ অক্ষরের আলফানিউমেরিক
export function isValidTrx(v) {
  return /^[A-Za-z0-9]{6,20}$/.test(v || '');
}

// ল্যাটিন-ভিত্তিক স্লাগ; বাংলা শিরোনাম হলে fallback হিসেবে টাইমস্ট্যাম্প-ভিত্তিক স্লাগ
export function slugify(title) {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (base.length >= 3) return base;
  return 'resource-' + Date.now().toString(36);
}

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'; // বিভ্রান্তিকর অক্ষর বাদ
export function shortCode(len = 6) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

// SHA-256 hex (সেশন টোকেন হ্যাশের জন্য)
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// settings টেবিল থেকে সব key-value পড়া
export async function getSettings(db) {
  const { results } = await db.prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of results || []) out[r.key] = r.value;
  return out;
}

// পাবলিকভাবে দেখানোর মতো সেটিংস শুধু
export function publicSettings(s) {
  return {
    site_name: s.site_name || 'মুক্তপাঠ',
    tagline: s.tagline || '',
    hero_title: s.hero_title || '',
    hero_subtitle: s.hero_subtitle || '',
    bkash_number: s.bkash_number || '',
    nagad_number: s.nagad_number || '',
    contact_email: s.contact_email || '',
    facebook_url: s.facebook_url || '',
    youtube_url: s.youtube_url || '',
    about_text: s.about_text || '',
  };
}

// ফান্ডের হিসাব: যাচাই হওয়া সাপোর্টের ১০% + যাচাই হওয়া সরাসরি অনুদান − খরচ
export async function fundSummary(db) {
  const sup = await db.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total FROM support_payments WHERE status='verified'"
  ).first();
  const don = await db.prepare(
    "SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS cnt FROM donations WHERE status='verified'"
  ).first();
  const exp = await db.prepare(
    'SELECT COALESCE(SUM(amount),0) AS total, COALESCE(SUM(beneficiaries),0) AS people FROM fund_expenses'
  ).first();
  const supportTotal = sup?.total || 0;
  const fromSupport = Math.floor(supportTotal * 0.10);
  const directDonations = don?.total || 0;
  const totalIn = fromSupport + directDonations;
  const totalOut = exp?.total || 0;
  return {
    support_total: supportTotal,
    from_support_10pct: fromSupport,
    direct_donations: directDonations,
    verified_donation_count: don?.cnt || 0,
    total_in: totalIn,
    total_out: totalOut,
    balance: totalIn - totalOut,
    expense_beneficiaries: exp?.people || 0,
  };
}

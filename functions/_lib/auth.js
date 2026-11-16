// অ্যাডমিন অথ — PBKDF2 (WebCrypto) পাসওয়ার্ড হ্যাশ + হ্যাশ-করা সেশন টোকেন
import { sha256Hex, randomToken } from './utils.js';

const PBKDF2_ITERATIONS = 100000;
const SESSION_TTL_DAYS = 7;
export const SESSION_COOKIE = 'rg_admin_session';

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256
  );
  return {
    hash: bytesToHex(bits),
    salt: saltHex || bytesToHex(salt),
    iterations,
  };
}

export async function verifyPassword(password, user) {
  const { hash } = await hashPassword(password, user.salt, user.iterations || PBKDF2_ITERATIONS);
  // ধ্রুব-সময় তুলনা (সাধারণ)
  if (hash.length !== user.password_hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ user.password_hash.charCodeAt(i);
  return diff === 0;
}

export async function createSession(db, adminId) {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 864e5).toISOString();
  await db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?1, ?2, ?3)')
    .bind(tokenHash, adminId, expires).run();
  return token;
}

export function sessionCookieHeader(token, maxAgeDays = SESSION_TTL_DAYS) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeDays * 86400}`;
}
export function clearCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSessionToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE) return rest.join('=');
  }
  return null;
}

// লগইন করা অ্যাডমিন ফেরত দেয়, না হলে null
export async function getAdmin(request, db) {
  const token = readSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await db.prepare(
    `SELECT a.id, a.email FROM sessions s JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')`
  ).bind(tokenHash).first();
  return row || null;
}

export async function destroySession(request, db) {
  const token = readSessionToken(request);
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(tokenHash).run();
}

// --- লগইন রেট-লিমিট: ১৫ মিনিটে ৫ বার ব্যর্থ হলে সাময়িক ব্লক ---
export async function loginLocked(db, identifier) {
  const row = await db.prepare(
    `SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE identifier = ?1 AND success = 0 AND attempted_at > datetime('now','-15 minutes')`
  ).bind(identifier).first();
  return (row?.cnt || 0) >= 5;
}
export async function recordLoginAttempt(db, identifier, success) {
  await db.prepare('INSERT INTO login_attempts (identifier, success) VALUES (?1, ?2)')
    .bind(identifier, success ? 1 : 0).run();
  if (success) {
    await db.prepare('DELETE FROM login_attempts WHERE identifier = ?1').bind(identifier).run();
  }
}

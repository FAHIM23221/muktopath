// অ্যাডমিন গার্ড — সেশন যাচাই না হলে 401
import { getAdmin } from './auth.js';
import { error } from './utils.js';

export async function requireAdmin(request, env) {
  const admin = await getAdmin(request, env.DB);
  if (!admin) return { admin: null, response: error('লগইন করা নেই — আবার লগইন করুন', 401) };
  return { admin, response: null };
}

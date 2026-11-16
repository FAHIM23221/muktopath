// POST /api/admin/setup — প্রথম অ্যাডমিন তৈরি (শুধু যখন কোনো অ্যাডমিন নেই
// এবং SETUP_TOKEN সিক্রেট মিলে যায়)। সেটআপ শেষে টোকেনটি মুছে ফেলাই ভালো।
import { json, error, readJson, clean, isValidEmail } from '../../_lib/utils.js';
import { hashPassword } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  if (!env.SETUP_TOKEN) return error('SETUP_TOKEN সিক্রেট সেট করা হয়নি — আগে সেট করুন (README দেখুন)', 503);
  const existing = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM admin_users').first();
  if ((existing?.cnt || 0) > 0) return error('অ্যাডমিন ইতিমধ্যে তৈরি হয়ে গেছে', 409);

  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  if (clean(body.setup_token, 200) !== env.SETUP_TOKEN) return error('SETUP_TOKEN মেলেনি', 403);

  const email = clean(body.email, 150).toLowerCase();
  const password = String(body.password || '');
  if (!isValidEmail(email)) return error('সঠিক ইমেইল দিন');
  if (password.length < 10) return error('পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে');

  const { hash, salt, iterations } = await hashPassword(password);
  await env.DB.prepare('INSERT INTO admin_users (email, password_hash, salt, iterations) VALUES (?1,?2,?3,?4)')
    .bind(email, hash, salt, iterations).run();
  return json({ ok: true, message: 'অ্যাডমিন তৈরি হয়েছে! এখন লগইন করুন এবং SETUP_TOKEN সিক্রেটটি সরিয়ে ফেলুন।' });
}

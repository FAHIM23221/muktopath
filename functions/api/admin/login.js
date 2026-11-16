// POST /api/admin/login — রেট-লিমিটসহ লগইন, সেশন কুকি সেট করে
import { json, error, readJson, clean } from '../../_lib/utils.js';
import { verifyPassword, createSession, sessionCookieHeader, loginLocked, recordLoginAttempt } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  const email = clean(body.email, 150).toLowerCase();
  const password = String(body.password || '');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const identifier = `${email}|${ip}`;

  if (await loginLocked(env.DB, identifier)) {
    return error('অনেকবার ভুল চেষ্টা হয়েছে — ১৫ মিনিট পর আবার চেষ্টা করুন', 429);
  }

  const user = await env.DB.prepare('SELECT * FROM admin_users WHERE email = ?1').bind(email).first();
  const ok = user ? await verifyPassword(password, user) : false;
  await recordLoginAttempt(env.DB, identifier, ok);
  if (!ok) return error('ইমেইল বা পাসওয়ার্ড মেলেনি', 401);

  const token = await createSession(env.DB, user.id);
  return json({ ok: true, email: user.email }, 200, { 'Set-Cookie': sessionCookieHeader(token) });
}

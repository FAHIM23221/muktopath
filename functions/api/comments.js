// /api/comments — GET: অনুমোদিত মন্তব্য (page=support|good-cause) | POST: মন্তব্য জমা (মডারেশনের পর প্রকাশ)
import { json, error, readJson, clean } from '../_lib/utils.js';

const PAGES = ['support', 'good-cause'];

export async function onRequestGet({ env, request }) {
  const page = new URL(request.url).searchParams.get('page') || '';
  if (!PAGES.includes(page)) return error('সঠিক page দরকার', 400);
  const { results } = await env.DB.prepare(
    "SELECT name, body, created_at FROM comments WHERE page=?1 AND status='approved' ORDER BY created_at DESC LIMIT 50"
  ).bind(page).all();
  return json({ ok: true, comments: results || [] });
}

export async function onRequestPost({ env, request }) {
  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  const page = PAGES.includes(body.page) ? body.page : null;
  const name = clean(body.name, 80);
  const text = clean(body.body, 500);
  if (!page) return error('সঠিক page দরকার');
  if (!name || !text) return error('নাম ও মন্তব্য দুটোই লিখুন');
  await env.DB.prepare('INSERT INTO comments (page, name, body) VALUES (?1,?2,?3)')
    .bind(page, name, text).run();
  return json({ ok: true, message: 'মন্তব্য জমা হয়েছে — যাচাইয়ের পর প্রকাশ হবে।' });
}

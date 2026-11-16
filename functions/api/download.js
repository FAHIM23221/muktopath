// GET /api/download?id=... — কাউন্টার বাড়িয়ে ফাইলে রিডাইরেক্ট
import { error, toInt } from '../_lib/utils.js';

export async function onRequestGet({ env, request }) {
  const id = toInt(new URL(request.url).searchParams.get('id'), 0);
  if (!id) return error('সঠিক রিসোর্স আইডি দরকার', 400);

  const row = await env.DB.prepare(
    "SELECT id, file_key, external_url FROM resources WHERE id = ?1 AND status = 'published'"
  ).bind(id).first();
  if (!row) return error('রিসোর্সটি পাওয়া যায়নি', 404);
  if (!row.file_key && !row.external_url) return error('এই রিসোর্সের ফাইল এখনো যোগ হয়নি', 404);

  // কাউন্টার + লগ (লগ ব্যর্থ হলেও ডাউনলোড আটকাবে না)
  await env.DB.prepare('UPDATE resources SET download_count = download_count + 1 WHERE id = ?1').bind(id).run();
  try {
    await env.DB.prepare('INSERT INTO downloads (resource_id, user_agent) VALUES (?1, ?2)')
      .bind(id, (request.headers.get('User-Agent') || '').slice(0, 200)).run();
  } catch { /* ignore */ }

  const target = row.file_key ? `/api/files/${row.file_key}` : row.external_url;
  return Response.redirect(new URL(target, request.url).toString(), 302);
}

// /api/admin/categories — GET: সব | POST: নতুন ক্যাটাগরি
import { json, error, readJson, clean, toInt, slugify } from '../../../_lib/utils.js';
import { requireAdmin } from '../../../_lib/admin.js';

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  return json({ ok: true, categories: results || [] });
}

export async function onRequestPost({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  const name = clean(body?.name, 100);
  if (!name) return error('ক্যাটাগরির নাম দরকার');
  const slug = slugify(clean(body?.slug, 80) || name) + '-' + Date.now().toString(36).slice(-4);
  try {
    const r = await env.DB.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?1,?2,?3,?4)')
      .bind(name, body?.slug ? slugify(clean(body.slug, 80)) : slug, clean(body?.description, 300), toInt(body?.sort_order, 0)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  } catch (e) {
    if (String(e.message || e).includes('UNIQUE')) return error('এই slug আগেই আছে — অন্য slug দিন', 409);
    throw e;
  }
}

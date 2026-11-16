// /api/admin/resources — GET: সব রিসোর্স (ড্রাফটসহ) | POST: নতুন রিসোর্স
import { json, error, readJson, clean, toInt, slugify, shortCode } from '../../../_lib/utils.js';
import { requireAdmin } from '../../../_lib/admin.js';

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const { results } = await env.DB.prepare(
    `SELECT r.*, c.name AS category_name FROM resources r
     LEFT JOIN categories c ON c.id = r.category_id ORDER BY r.created_at DESC`
  ).all();
  return json({ ok: true, resources: results || [] });
}

async function uniqueSlug(db, base) {
  let slug = base; let n = 2;
  while (await db.prepare('SELECT id FROM resources WHERE slug = ?1').bind(slug).first()) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
async function uniqueCode(db) {
  for (let i = 0; i < 10; i++) {
    const code = shortCode(6);
    if (!await db.prepare('SELECT id FROM resources WHERE short_code = ?1').bind(code).first()) return code;
  }
  return shortCode(9);
}

export async function onRequestPost({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  const title = clean(body.title, 200);
  if (!title) return error('শিরোনাম দরকার');
  const slug = await uniqueSlug(env.DB, slugify(clean(body.slug, 80) || title));
  const code = await uniqueCode(env.DB);
  const status = body.status === 'published' ? 'published' : 'draft';

  const r = await env.DB.prepare(
    `INSERT INTO resources (title, slug, short_code, description, category_id, file_type,
       file_key, external_url, cover_url, file_size, tags, is_featured, status)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`
  ).bind(
    title, slug, code,
    clean(body.description, 5000),
    body.category_id ? toInt(body.category_id) : null,
    clean(body.file_type, 30),
    clean(body.file_key, 300),
    clean(body.external_url, 1000),
    clean(body.cover_url, 1000),
    clean(body.file_size, 30),
    clean(body.tags, 300),
    body.is_featured ? 1 : 0,
    status
  ).run();
  return json({ ok: true, id: r.meta.last_row_id, slug, short_code: code });
}

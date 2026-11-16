// /api/admin/resources/:id — GET | PUT (এডিট) | DELETE
import { json, error, readJson, clean, toInt } from '../../../_lib/utils.js';
import { requireAdmin } from '../../../_lib/admin.js';

export async function onRequestGet({ env, request, params }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const row = await env.DB.prepare('SELECT * FROM resources WHERE id = ?1').bind(toInt(params.id)).first();
  if (!row) return error('পাওয়া যায়নি', 404);
  return json({ ok: true, resource: row });
}

export async function onRequestPut({ env, request, params }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const id = toInt(params.id);
  const body = await readJson(request);
  if (!body) return error('সঠিক তথ্য পাঠানো হয়নি');
  const title = clean(body.title, 200);
  if (!title) return error('শিরোনাম দরকার');
  const status = body.status === 'published' ? 'published' : 'draft';
  await env.DB.prepare(
    `UPDATE resources SET title=?1, description=?2, category_id=?3, file_type=?4,
       file_key=?5, external_url=?6, cover_url=?7, file_size=?8, tags=?9,
       is_featured=?10, status=?11, updated_at=datetime('now') WHERE id=?12`
  ).bind(
    title, clean(body.description, 5000),
    body.category_id ? toInt(body.category_id) : null,
    clean(body.file_type, 30), clean(body.file_key, 300), clean(body.external_url, 1000),
    clean(body.cover_url, 1000), clean(body.file_size, 30), clean(body.tags, 300),
    body.is_featured ? 1 : 0, status, id
  ).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, request, params }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const id = toInt(params.id);
  const row = await env.DB.prepare('SELECT file_key FROM resources WHERE id = ?1').bind(id).first();
  if (row?.file_key && env.BUCKET) {
    try { await env.BUCKET.delete(row.file_key); } catch { /* ফাইল না থাকলেও রেকর্ড মুছবে */ }
  }
  await env.DB.prepare('DELETE FROM resources WHERE id = ?1').bind(id).run();
  return json({ ok: true });
}

// /api/admin/categories/:id — PUT (এডিট) | DELETE (রিসোর্সগুলোর category_id NULL হবে)
import { json, error, readJson, clean, toInt } from '../../../_lib/utils.js';
import { requireAdmin } from '../../../_lib/admin.js';

export async function onRequestPut({ env, request, params }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  const name = clean(body?.name, 100);
  if (!name) return error('ক্যাটাগরির নাম দরকার');
  await env.DB.prepare('UPDATE categories SET name=?1, description=?2, sort_order=?3 WHERE id=?4')
    .bind(name, clean(body?.description, 300), toInt(body?.sort_order, 0), toInt(params.id)).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, request, params }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  await env.DB.prepare('DELETE FROM categories WHERE id = ?1').bind(toInt(params.id)).run();
  return json({ ok: true });
}

// /api/admin/messages — GET ইনবক্স | PUT ?id= {status} | DELETE ?id=
import { json, error, readJson, toInt } from '../../_lib/utils.js';
import { requireAdmin } from '../../_lib/admin.js';

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const { results } = await env.DB.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200').all();
  return json({ ok: true, messages: results || [] });
}

export async function onRequestPut({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  const id = toInt(body?.id);
  const status = ['unread', 'read', 'replied'].includes(body?.status) ? body.status : null;
  if (!id || !status) return error('সঠিক তথ্য দরকার');
  await env.DB.prepare('UPDATE messages SET status=?1 WHERE id=?2').bind(status, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const id = toInt(new URL(request.url).searchParams.get('id'));
  if (!id) return error('id দরকার');
  await env.DB.prepare('DELETE FROM messages WHERE id = ?1').bind(id).run();
  return json({ ok: true });
}

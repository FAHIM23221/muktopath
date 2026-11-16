// GET /api/admin/payments?status=pending — সাপোর্ট + অনুদানের যাচাই তালিকা
import { json } from '../../_lib/utils.js';
import { requireAdmin } from '../../_lib/admin.js';

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const status = new URL(request.url).searchParams.get('status') || 'pending';
  const valid = ['pending', 'verified', 'rejected', 'all'];
  const st = valid.includes(status) ? status : 'pending';
  const cond = st === 'all' ? '' : `WHERE status='${st}'`;
  const { results: support } = await env.DB.prepare(
    `SELECT *, 'support' AS kind FROM support_payments ${cond} ORDER BY created_at DESC LIMIT 200`
  ).all();
  const { results: donations } = await env.DB.prepare(
    `SELECT *, 'donation' AS kind FROM donations ${cond} ORDER BY created_at DESC LIMIT 200`
  ).all();
  return json({ ok: true, support: support || [], donations: donations || [] });
}

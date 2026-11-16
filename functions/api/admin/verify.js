// POST /api/admin/verify — { kind: 'support'|'donation', id, action: 'verified'|'rejected' }
// যাচাই হলেই ফান্ডের হিসাব অটো বদলায় (fundSummary লাইভ হিসাব করে — আলাদা এন্ট্রি লাগে না)
import { json, error, readJson, toInt } from '../../_lib/utils.js';
import { requireAdmin } from '../../_lib/admin.js';

const TABLES = { support: 'support_payments', donation: 'donations' };

export async function onRequestPost({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  const table = TABLES[body?.kind];
  const id = toInt(body?.id);
  const action = body?.action;
  if (!table || !id || !['verified', 'rejected'].includes(action)) return error('সঠিক তথ্য দরকার');
  const r = await env.DB.prepare(
    `UPDATE ${table} SET status=?1, verified_at=CASE WHEN ?1='verified' THEN datetime('now') ELSE verified_at END
     WHERE id=?2 AND status='pending'`
  ).bind(action, id).run();
  if (!r.meta.changes) return error('এই এন্ট্রিটি আগেই সিদ্ধান্ত নেওয়া হয়েছে', 409);
  return json({ ok: true });
}

// GET /api/admin/me — বর্তমান লগইন অবস্থা (+ অ্যাডমিন আছে কিনা: সেটআপ দরকার কিনা বোঝার জন্য)
import { json } from '../../_lib/utils.js';
import { getAdmin } from '../../_lib/auth.js';

export async function onRequestGet({ env, request }) {
  const count = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM admin_users').first();
  const admin = await getAdmin(request, env.DB);
  return json({ ok: true, has_admin: (count?.cnt || 0) > 0, admin: admin ? { id: admin.id, email: admin.email } : null });
}

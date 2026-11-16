// /api/admin/settings — GET সব সেটিংস | PUT আপডেট (allowlist করা key শুধু)
import { json, error, readJson, clean } from '../../_lib/utils.js';
import { requireAdmin } from '../../_lib/admin.js';
import { getSettings } from '../../_lib/utils.js';

const KEYS = ['site_name', 'tagline', 'hero_title', 'hero_subtitle', 'bkash_number', 'nagad_number',
  'contact_email', 'facebook_url', 'youtube_url', 'beneficiaries_count', 'about_text'];

export async function onRequestGet({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  return json({ ok: true, settings: await getSettings(env.DB) });
}

export async function onRequestPut({ env, request }) {
  const { response } = await requireAdmin(request, env);
  if (response) return response;
  const body = await readJson(request);
  if (!body || typeof body !== 'object') return error('সঠিক তথ্য দরকার');
  const stmts = [];
  for (const key of KEYS) {
    if (key in body) {
      const max = key === 'about_text' || key === 'hero_subtitle' ? 2000 : 500;
      let val = clean(body[key], max);
      if (key === 'beneficiaries_count') val = String(Math.max(0, parseInt(val, 10) || 0));
      stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, val));
    }
  }
  if (!stmts.length) return error('বদলানোর মতো কিছু পাঠানো হয়নি');
  await env.DB.batch(stmts);
  return json({ ok: true, settings: await getSettings(env.DB) });
}

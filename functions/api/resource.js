// GET /api/resource?slug=... — একটি রিসোর্সের বিস্তারিত + সম্পর্কিত রিসোর্স
import { json, error } from '../_lib/utils.js';

export async function onRequestGet({ env, request }) {
  const slug = new URL(request.url).searchParams.get('slug') || '';
  if (!slug) return error('slug দরকার', 400);
  const row = await env.DB.prepare(
    `SELECT r.*, c.name AS category_name, c.slug AS category_slug
     FROM resources r LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.slug = ?1 AND r.status = 'published'`
  ).bind(slug).first();
  if (!row) return error('রিসোর্সটি পাওয়া যায়নি', 404);

  const { results: related } = await env.DB.prepare(
    `SELECT id, title, slug, short_code, file_type, cover_url, download_count
     FROM resources WHERE status='published' AND category_id IS ?1 AND id != ?2
     ORDER BY download_count DESC LIMIT 4`
  ).bind(row.category_id, row.id).all();

  // ফাইলের আসল ঠিকানা পাবলিক রেসপন্সে পাঠানো হয় না — ডাউনলোড হয় /api/download দিয়ে
  const { file_key, external_url, ...safe } = row;
  return json({ ok: true, resource: { ...safe, has_file: !!(file_key || external_url) }, related: related || [] });
}

// GET /api/categories — ক্যাটাগরি তালিকা (প্রকাশিত রিসোর্স সংখ্যাসহ)
import { json } from '../_lib/utils.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.slug, c.description, c.sort_order,
            (SELECT COUNT(*) FROM resources r WHERE r.category_id = c.id AND r.status='published') AS resource_count
     FROM categories c ORDER BY c.sort_order, c.id`
  ).all();
  return json({ ok: true, categories: results || [] });
}

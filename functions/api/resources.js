// GET /api/resources — প্রকাশিত রিসোর্স তালিকা
// query: q (খোঁজ), category (slug), sort (new|popular|title), featured=1, page, limit
import { json, toInt } from '../_lib/utils.js';

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const category = (url.searchParams.get('category') || '').trim();
  const sort = url.searchParams.get('sort') || 'new';
  const featured = url.searchParams.get('featured') === '1';
  const limit = Math.min(Math.max(toInt(url.searchParams.get('limit'), 12), 1), 60);
  const page = Math.max(toInt(url.searchParams.get('page'), 1), 1);
  const offset = (page - 1) * limit;

  const where = ["r.status = 'published'"];
  const binds = [];
  if (q) { where.push('(r.title LIKE ? OR r.description LIKE ? OR r.tags LIKE ?)'); const like = `%${q}%`; binds.push(like, like, like); }
  if (category) { where.push('c.slug = ?'); binds.push(category); }
  if (featured) where.push('r.is_featured = 1');
  const whereSql = where.join(' AND ');

  const order = sort === 'popular' ? 'r.download_count DESC, r.created_at DESC'
    : sort === 'title' ? 'r.title ASC'
    : 'r.created_at DESC';

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM resources r LEFT JOIN categories c ON c.id = r.category_id WHERE ${whereSql}`
  ).bind(...binds).first();

  const { results } = await env.DB.prepare(
    `SELECT r.id, r.title, r.slug, r.short_code, r.description, r.file_type, r.cover_url,
            r.file_size, r.tags, r.is_featured, r.download_count, r.created_at,
            c.name AS category_name, c.slug AS category_slug
     FROM resources r LEFT JOIN categories c ON c.id = r.category_id
     WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  return json({
    ok: true,
    resources: results || [],
    total: totalRow?.total || 0,
    page, limit,
    pages: Math.max(1, Math.ceil((totalRow?.total || 0) / limit)),
  });
}
